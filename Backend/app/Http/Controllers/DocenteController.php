<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Services\BitacoraService;

/**
 * CU8 - GESTIONAR DOCENTES
 * Diagrama de Secuencia:
 * Actor → «UI» ModuloDocentes → «CC» DocenteController → «E» Docentes
 *
 * 1.2: validarCamposObligatorios | 1.4: verificarDuplicado(ci, correo)
 * ALT [duplicado]: 1.6 retornarError | ALT [válido]: 1.7 store/update/destroy
 *
 * CU11 - GESTIONAR ASIGNACIONES DE DOCENTES
 * 1.2: verificarLimiteGrupos(limite: 4) | 1.10: guardarAsignacion()
 * 1.12: mostrarCargaHoraria(grupos, materias, aulas, horarios)
 *
 * Controlador CRUD de docentes (CU8 - Gestionar Docentes).
 * Al crear un docente también se crea un usuario asociado con rol_id=2.
 * Al eliminar un docente, se eliminan primero sus asignaciones a grupos.
 */
class DocenteController extends Controller
{
    /**
     * Query base reutilizable con JOIN a usuarios para obtener CI y correo del docente.
     * Se usa en index(), show() y search() para evitar duplicación de código.
     */
    private function selectDocente()
    {
        return DB::table('docentes')
            ->leftJoin('usuarios', 'docentes.usuario_id', '=', 'usuarios.id')
            ->select(
                'docentes.id',
                'docentes.usuario_id',
                'docentes.nombres',
                'docentes.apellidos',
                'docentes.profesion',
                'docentes.tiene_maestria',
                'docentes.tiene_diplomado',
                'usuarios.username as ci',
                'usuarios.correo',
                'usuarios.estado'
            );
    }

    public function index()
    {
        $docentes = $this->selectDocente()
            ->orderBy('docentes.apellidos')
            ->get();

        return response()->json($docentes);
    }

    /**
     * Crea un docente y su usuario asociado en dos inserciones separadas.
     *
     * Primero crea el usuario (rol_id=2, username=CI, password=Hash(CI), correo).
     * Luego crea el docente vinculado mediante usuario_id.
     * No usa transacción explícita (si falla el docente, el usuario queda huérfano).
     *
     * @param  Request $request  ci*, nombres*, apellidos*, correo*, profesion*,
     *                           tiene_maestria (bool), tiene_diplomado (bool)
     * @return \Illuminate\Http\JsonResponse  { message, id } (201)
     */
    public function store(Request $request)
    {
        $request->validate([
            'ci'              => 'required|string|unique:usuarios,username',
            'nombres'         => 'required|string',
            'apellidos'       => 'required|string',
            'correo'          => 'required|email|unique:usuarios,correo',
            'profesion'       => 'required|string',
            'tiene_maestria'  => 'boolean',
            'tiene_diplomado' => 'boolean',
        ]);

        $usuario_id = DB::table('usuarios')->insertGetId([
            'rol_id'   => 2,
            'username' => $request->ci,
            'password' => Hash::make($request->ci),
            'correo'   => $request->correo,
            'estado'   => true,
        ]);

        $id = DB::table('docentes')->insertGetId([
            'usuario_id'      => $usuario_id,
            'nombres'         => $request->nombres,
            'apellidos'       => $request->apellidos,
            'profesion'       => $request->profesion,
            'tiene_maestria'  => $request->boolean('tiene_maestria'),
            'tiene_diplomado' => $request->boolean('tiene_diplomado'),
        ]);

        BitacoraService::registrar(
            request()->header('X-User-Id'),
            'INSERT',
            'docentes',
            'Registro de docente: ' . $request->nombres
        );

        return response()->json(['message' => 'Docente registrado', 'id' => $id], 201);
    }

    public function show($id)
    {
        $docente = $this->selectDocente()->where('docentes.id', $id)->first();
        if (!$docente) return response()->json(['message' => 'No encontrado'], 404);
        return response()->json($docente);
    }

    public function update(Request $request, $id)
    {
        $docente = DB::table('docentes')->where('id', $id)->first();
        if (!$docente) return response()->json(['message' => 'No encontrado'], 404);

        $request->validate([
            'ci'              => 'required|string|unique:usuarios,username,' . $docente->usuario_id,
            'nombres'         => 'required|string',
            'apellidos'       => 'required|string',
            'correo'          => 'required|email|unique:usuarios,correo,' . $docente->usuario_id,
            'profesion'       => 'required|string',
            'tiene_maestria'  => 'boolean',
            'tiene_diplomado' => 'boolean',
        ]);

        DB::table('usuarios')->where('id', $docente->usuario_id)->update([
            'username' => $request->ci,
            'correo'   => $request->correo,
        ]);

        DB::table('docentes')->where('id', $id)->update([
            'nombres'         => $request->nombres,
            'apellidos'       => $request->apellidos,
            'profesion'       => $request->profesion,
            'tiene_maestria'  => $request->boolean('tiene_maestria'),
            'tiene_diplomado' => $request->boolean('tiene_diplomado'),
        ]);

        BitacoraService::registrar(
            request()->header('X-User-Id'),
            'UPDATE',
            'docentes',
            'Modificación de docente ID: ' . $id
        );

        return response()->json(['message' => 'Docente actualizado']);
    }

    /**
     * Elimina un docente con sus dependencias en cascada.
     *
     * Orden de eliminación (respeta FK):
     * asignaciones_docentes → docente → usuario (si tiene usuario_id)
     *
     * @param  int $id  ID del docente a eliminar
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $docente = DB::table('docentes')->where('id', $id)->first();
        if (!$docente) return response()->json(['message' => 'No encontrado'], 404);

        DB::table('asignaciones_docentes')->where('docente_id', $id)->delete();
        DB::table('docentes')->where('id', $id)->delete();

        if ($docente->usuario_id) {
            DB::table('usuarios')->where('id', $docente->usuario_id)->delete();
        }

        BitacoraService::registrar(
            request()->header('X-User-Id'),
            'DELETE',
            'docentes',
            'Eliminación de docente ID: ' . $id
        );

        return response()->json(['message' => 'Docente eliminado correctamente']);
    }

    public function search(Request $request)
    {
        $q = $request->query('q', '');

        $docentes = $this->selectDocente()
            ->where(function ($query) use ($q) {
                $query->where('docentes.nombres', 'ilike', "%$q%")
                      ->orWhere('docentes.apellidos', 'ilike', "%$q%")
                      ->orWhere('usuarios.username', 'ilike', "%$q%");
            })
            ->orderBy('docentes.apellidos')
            ->get();

        return response()->json($docentes);
    }

    public function estadisticas()
    {
        $total        = DB::table('docentes')->count();
        $conMaestria  = DB::table('docentes')->where('tiene_maestria', true)->count();
        $conDiplomado = DB::table('docentes')->where('tiene_diplomado', true)->count();
        $conAmbos     = DB::table('docentes')->where('tiene_maestria', true)->where('tiene_diplomado', true)->count();

        return response()->json([
            'total'         => $total,
            'con_maestria'  => $conMaestria,
            'con_diplomado' => $conDiplomado,
            'con_ambos'     => $conAmbos,
        ]);
    }

    /**
     * Lista todas las asignaciones docente-materia-grupo con datos de aula, horario y turno.
     *
     * Realiza JOIN entre: asignaciones_docentes → docentes → materias → grupos
     *                     → aulas → horarios
     * El campo 'turno' se calcula con CASE WHEN sobre horario_ini en PostgreSQL.
     *
     * @return \Illuminate\Http\JsonResponse  Array de asignaciones con turno calculado
     */
    public function asignaciones()
    {
        $asignaciones = DB::table('asignaciones_docentes')
            ->join('docentes',  'asignaciones_docentes.docente_id',  '=', 'docentes.id')
            ->join('materias',  'asignaciones_docentes.materia_id',  '=', 'materias.id')
            ->join('grupos',    'asignaciones_docentes.grupo_id',     '=', 'grupos.id')
            ->leftJoin('aulas',    'grupos.aula_id',    '=', 'aulas.id')
            ->leftJoin('horarios', 'grupos.horario_id', '=', 'horarios.id')
            ->select(
                DB::raw("docentes.nombres || ' ' || docentes.apellidos AS docente"),
                'materias.nombre as materia',
                'grupos.nombre as grupo',
                'grupos.gestion',
                'aulas.nombre as aula',
                DB::raw("TO_CHAR(horarios.horario_ini, 'HH24:MI') as horario_ini"),
                DB::raw("TO_CHAR(horarios.horario_fin, 'HH24:MI') as horario_fin"),
                'horarios.dias',
                DB::raw("
                    CASE
                        WHEN horarios.horario_ini < '12:00:00'::time THEN 'Manana'
                        WHEN horarios.horario_ini < '18:00:00'::time THEN 'Tarde'
                        ELSE 'Noche'
                    END as turno
                ")
            )
            ->orderBy('grupos.nombre')
            ->orderBy('materias.nombre')
            ->get();

        return response()->json($asignaciones);
    }
}
