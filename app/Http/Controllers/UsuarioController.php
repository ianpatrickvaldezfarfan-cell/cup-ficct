<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Services\BitacoraService;

/**
 * Controlador de gestion de usuarios y roles (CU7).
 *
 * Administra las cuentas de acceso del sistema (administradores, docentes,
 * postulantes). Soporta CRUD individual, activacion/desactivacion y carga
 * masiva desde archivos CSV con validacion previa a la transaccion.
 * Roles disponibles: 1=administrador, 2=docente, 3=postulante.
 */
class UsuarioController extends Controller
{
    /**
     * Lista todos los usuarios con su nombre de rol incluido.
     *
     * @return \Illuminate\Http\JsonResponse  Array de usuarios con campo 'rol_nombre'
     */
    public function index()
    {
        $usuarios = DB::table('usuarios as u')
            ->join('roles as r', 'u.rol_id', '=', 'r.id')
            ->select('u.*', 'r.nombre as rol_nombre')
            ->orderBy('u.id', 'desc')
            ->get();
        return response()->json($usuarios);
    }

    /**
     * Crea un nuevo usuario individual en el sistema.
     *
     * Valida unicidad de username y correo, hashea la contrasena con Hash::make()
     * y registra el evento en bitacora con accion INSERT.
     *
     * @param  Request $request  username*, correo*, password*, rol_id* (1|2|3)
     * @return \Illuminate\Http\JsonResponse  Usuario creado con rol_nombre (201)
     */
    public function store(Request $request)
    {
        $request->validate([
            'username' => 'required|string|unique:usuarios,username',
            'correo'   => 'required|email|unique:usuarios,correo',
            'password' => 'required|string|min:4',
            'rol_id'   => 'required|integer|exists:roles,id',
        ]);

        $id = DB::table('usuarios')->insertGetId([
            'rol_id'     => $request->rol_id,
            'username'   => $request->username,
            'password'   => Hash::make($request->password),
            'correo'     => $request->correo,
            'estado'     => true,
            'created_at' => now(),
        ]);

        $usuario = DB::table('usuarios as u')
            ->join('roles as r', 'u.rol_id', '=', 'r.id')
            ->where('u.id', $id)
            ->select('u.*', 'r.nombre as rol_nombre')
            ->first();

        BitacoraService::registrar(
            request()->header('X-User-Id'),
            'INSERT',
            'usuarios',
            'Creación de usuario: ' . $request->username
        );

        return response()->json($usuario, 201);
    }

    /**
     * Actualiza los datos de un usuario existente.
     *
     * La contrasena es opcional: si no se envia, mantiene la actual.
     * Si se envia, se hashea con Hash::make() antes de almacenar.
     *
     * @param  Request $request  username*, correo*, rol_id*, password (opcional)
     * @param  int     $id       ID del usuario a modificar
     * @return \Illuminate\Http\JsonResponse  Usuario actualizado con rol_nombre
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'username' => 'required|string|unique:usuarios,username,' . $id,
            'correo'   => 'required|email|unique:usuarios,correo,' . $id,
            'rol_id'   => 'required|integer|exists:roles,id',
            'password' => 'nullable|string|min:4',
        ]);

        $data = [
            'username' => $request->username,
            'correo'   => $request->correo,
            'rol_id'   => $request->rol_id,
        ];
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        DB::table('usuarios')->where('id', $id)->update($data);

        $usuario = DB::table('usuarios as u')
            ->join('roles as r', 'u.rol_id', '=', 'r.id')
            ->where('u.id', $id)
            ->select('u.*', 'r.nombre as rol_nombre')
            ->first();

        return response()->json($usuario);
    }

    /**
     * Activa la cuenta de un usuario (estado = true).
     * Permite al usuario iniciar sesion nuevamente si fue desactivado.
     *
     * @param  int $id  ID del usuario a activar
     * @return \Illuminate\Http\JsonResponse
     */
    public function activar($id)
    {
        DB::table('usuarios')->where('id', $id)->update(['estado' => true]);
        BitacoraService::registrar(
            request()->header('X-User-Id'),
            'UPDATE',
            'usuarios',
            'Activación de usuario ID: ' . $id
        );
        return response()->json(['message' => 'Usuario activado']);
    }

    /**
     * Desactiva la cuenta de un usuario (estado = false).
     * El usuario no podra iniciar sesion hasta ser reactivado.
     * El registro no se elimina de la BD para mantener el historial.
     *
     * @param  int $id  ID del usuario a desactivar
     * @return \Illuminate\Http\JsonResponse
     */
    public function desactivar($id)
    {
        DB::table('usuarios')->where('id', $id)->update(['estado' => false]);
        BitacoraService::registrar(
            request()->header('X-User-Id'),
            'UPDATE',
            'usuarios',
            'Desactivación de usuario ID: ' . $id
        );
        return response()->json(['message' => 'Usuario desactivado']);
    }

    /**
     * Carga masiva de usuarios desde un archivo CSV.
     *
     * Estrategia de dos fases para evitar errores de savepoint en PostgreSQL:
     * 1) Fase de validacion: recorre todas las filas y separa validas de invalidas
     *    sin tocar la BD. Verifica unicidad de username y correo contra BD y
     *    contra el propio lote (para detectar duplicados dentro del CSV).
     * 2) Fase de insercion: inserta solo las filas validas en un DB::transaction()
     *    atomico. Si falla, hace rollback de todas.
     *
     * Formato CSV esperado: username,correo,password,rol_id
     *
     * @param  Request $request  Archivo CSV (campo 'archivo', max 2MB)
     * @return \Illuminate\Http\JsonResponse  { creados: N, errores: [...], mensaje }
     */
    public function cargarCSV(Request $request)
    {
        $request->validate([
            'archivo' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        $contenido = file_get_contents($request->file('archivo')->getRealPath());
        $contenido = ltrim($contenido, "\xEF\xBB\xBF"); // quitar BOM UTF-8
        $lineas    = array_values(array_filter(array_map('trim', explode("\n", trim($contenido)))));

        if (empty($lineas)) {
            return response()->json(['message' => 'El archivo CSV está vacío.'], 422);
        }

        $header  = array_map('trim', str_getcsv($lineas[0]));
        $errores = [];
        $validos = [];

        for ($i = 1; $i < count($lineas); $i++) {
            $cols = str_getcsv($lineas[$i]);
            $fila = $i + 1;

            if (count($cols) < 4) {
                $errores[] = "Fila {$fila}: formato incorrecto (4 columnas esperadas)";
                continue;
            }

            $row = array_combine($header, array_map('trim', $cols));

            if (empty($row['username'] ?? '') || empty($row['correo'] ?? '') ||
                empty($row['password'] ?? '') || empty($row['rol_id'] ?? '')) {
                $errores[] = "Fila {$fila}: campos incompletos";
                continue;
            }
            if (DB::table('usuarios')->where('username', $row['username'])->exists() ||
                collect($validos)->contains('username', $row['username'])) {
                $errores[] = "Fila {$fila}: username '{$row['username']}' ya existe";
                continue;
            }
            if (DB::table('usuarios')->where('correo', $row['correo'])->exists() ||
                collect($validos)->contains('correo', $row['correo'])) {
                $errores[] = "Fila {$fila}: correo '{$row['correo']}' ya existe";
                continue;
            }
            if (!DB::table('roles')->where('id', (int) ($row['rol_id']))->exists()) {
                $errores[] = "Fila {$fila}: rol_id '{$row['rol_id']}' no válido";
                continue;
            }

            $validos[] = [
                'rol_id'     => (int) $row['rol_id'],
                'username'   => $row['username'],
                'password'   => Hash::make($row['password']),
                'correo'     => $row['correo'],
                'estado'     => true,
                'created_at' => now()->toDateTimeString(),
            ];
        }

        $creados = 0;
        if (!empty($validos)) {
            DB::transaction(function () use ($validos, &$creados) {
                foreach ($validos as $data) {
                    DB::table('usuarios')->insert($data);
                    $creados++;
                }
            });
        }

        return response()->json([
            'creados' => $creados,
            'errores' => $errores,
            'mensaje' => "{$creados} usuario(s) creado(s)" .
                         (count($errores) > 0 ? ', ' . count($errores) . ' error(es).' : '.'),
        ]);
    }

    public function search(Request $request)
    {
        $q = $request->query('q');
        $usuarios = DB::table('usuarios as u')
            ->join('roles as r', 'u.rol_id', '=', 'r.id')
            ->where(function ($query) use ($q) {
                $query->where('u.username', 'ilike', "%$q%")
                      ->orWhere('u.correo',   'ilike', "%$q%");
            })
            ->select('u.*', 'r.nombre as rol_nombre')
            ->orderBy('u.id', 'desc')
            ->get();
        return response()->json($usuarios);
    }
}
