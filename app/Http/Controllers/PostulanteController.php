<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Services\BitacoraService;

/**
 * CU3 - GESTIONAR POSTULANTES
 * Diagrama de Secuencia:
 * Actor → «UI» ModuloPostulantes → «CC» PostulanteController → «E» Postulantes
 *
 * Mensajes del diagrama:
 * 1: enviarDatosPostulante(ci, nombres, apellidos, fecha_nac,
 *    genero, direccion, telefono, colegio, ciudad) - Actor → UI
 * 1.1: procesarFormulario(datos) - UI → Controller
 * 1.2: validarCamposObligatorios(datos) - Controller → Postulantes
 * 1.3: [camposValidos] - Postulantes → Controller
 * 1.4: verificarCI(ci) - Controller → Postulantes
 * 1.5: [resultadoCI] - Postulantes → Controller
 * ALT [CI duplicado]:
 *   1.6: retornarError(CI ya registrado)
 *   1.7: mostrarError(CI duplicado)
 * ALT [CI válido]:
 *   1.8: store/update/destroy/search/index() - Controller → Postulantes
 *   1.9: [confirmacionOperacion] - Postulantes → Controller
 *   1.10: mostrarResultado() - Controller → UI → Actor
 *
 * Controlador CRUD de postulantes (CU3 - Gestionar Postulantes).
 * Administra el ciclo de vida completo de los postulantes desde el panel administrativo.
 * El método store() crea en una sola transacción: usuario (rol_id=3) + postulante +
 * postulacion (EN PROCESO), con verificación atómica de cupos usando lockForUpdate().
 * El método destroy() realiza eliminación en cascada respetando las FK de la BD.
 */
class PostulanteController extends Controller
{
    /**
     * Lista todos los postulantes con el grupo asignado en la gestión actual.
     *
     * Realiza LEFT JOIN a postulaciones (gestion=año actual) → grupo_postulantes → grupos
     * para incluir el nombre del grupo en cada postulante. Si no tiene grupo, grupo_nombre = null.
     *
     * @return \Illuminate\Http\JsonResponse  Array de postulantes con campo 'grupo_nombre'
     */
    public function index()
    {
        // DIAGRAMA SECUENCIA CU3 - Mensaje 1.8 [buscar/listar]
        // index() → retorna lista completa de postulantes con grupo asignado
        $gestion = date('Y');
        $postulantes = DB::table('postulantes as p')
            ->leftJoin('postulaciones as po', function ($join) use ($gestion) {
                $join->on('po.postulante_id', '=', 'p.id')
                     ->where('po.gestion', '=', $gestion);
            })
            ->leftJoin('grupo_postulantes as gp', 'gp.postulacion_id', '=', 'po.id')
            ->leftJoin('grupos as g', 'g.id', '=', 'gp.grupo_id')
            ->select('p.*', 'g.nombre as grupo_nombre')
            ->orderBy('p.id', 'desc')
            ->get();
        return response()->json($postulantes);
    }

    /**
     * Registra un nuevo postulante desde el panel administrativo.
     *
     * Ejecuta 4 pasos dentro de DB::transaction() con try/catch externo:
     * 1. Verificar cupos con lockForUpdate() — opcion1 primero, opcion2 si sin cupos
     * 2. Crear usuario (rol_id=3, username=correo, password=Hash(CI))
     * 3. Crear postulante con usuario_id
     * 4. Crear postulacion (estado_admision='EN PROCESO', gestion=año actual)
     *    para que el postulante aparezca en la generación automática de grupos.
     *
     * @param  Request $request  ci*, nombres*, apellidos*, fecha_nac*, genero*,
     *                           correo*, carrera_opcion1_id*, carrera_opcion2_id*
     * @return \Illuminate\Http\JsonResponse  { message, id, usuario_id } (201) o 422 si sin cupos
     */
    public function store(Request $request)
    {
        // DIAGRAMA SECUENCIA CU3 - Mensajes 1.2, 1.4, 1.8 [registrar]
        // 1.2: validarCamposObligatorios - $request->validate()
        // 1.4: verificarCI - unique:postulantes,ci
        // 1.8: store - INSERT en postulantes + usuarios + postulaciones
        $request->validate([
            'ci'                  => 'required|string|unique:postulantes,ci',
            'nombres'             => 'required|string',
            'apellidos'           => 'required|string',
            'fecha_nac'           => 'required|date',
            'genero'              => 'required|in:M,F,O',
            'correo'              => 'required|email|unique:postulantes,correo|unique:usuarios,correo',
            'carrera_opcion1_id'  => 'required|integer|exists:carreras,id',
            'carrera_opcion2_id'  => 'required|integer|exists:carreras,id|different:carrera_opcion1_id',
        ]);

        try {
            return DB::transaction(function () use ($request) {
                // PASO 1: Verificar cupos y reservar carrera
                $c1 = DB::table('carreras')->lockForUpdate()->where('id', $request->carrera_opcion1_id)->first();
                if ($c1 && $c1->cupos_disponibles > 0) {
                    DB::table('carreras')->where('id', $c1->id)->decrement('cupos_disponibles');
                    $carreraAsignadaId = $c1->id;
                } else {
                    $c2 = DB::table('carreras')->lockForUpdate()->where('id', $request->carrera_opcion2_id)->first();
                    if ($c2 && $c2->cupos_disponibles > 0) {
                        DB::table('carreras')->where('id', $c2->id)->decrement('cupos_disponibles');
                        $carreraAsignadaId = $c2->id;
                    } else {
                        throw new \Exception('No hay cupos disponibles en ninguna de las carreras seleccionadas.');
                    }
                }

                // PASO 2: Crear usuario
                $usuario_id = DB::table('usuarios')->insertGetId([
                    'rol_id'     => 3,
                    'username'   => $request->correo,
                    'password'   => $request->ci,
                    'correo'     => $request->correo,
                    'estado'     => true,
                    'created_at' => now(),
                ]);

                // PASO 3: Crear postulante con usuario_id
                $postulante_id = DB::table('postulantes')->insertGetId([
                    'usuario_id'          => $usuario_id,
                    'ci'                  => $request->ci,
                    'nombres'             => $request->nombres,
                    'apellidos'           => $request->apellidos,
                    'fecha_nac'           => $request->fecha_nac,
                    'genero'              => $request->genero,
                    'telefono'            => $request->telefono,
                    'correo'              => $request->correo,
                    'direccion'           => $request->direccion,
                    'colegio_procedencia' => $request->colegio_procedencia,
                    'ciudad'              => $request->ciudad,
                ]);

                // PASO 4: Crear postulacion para que aparezca en grupos
                DB::table('postulaciones')->insert([
                    'postulante_id'       => $postulante_id,
                    'carrera_opcion1_id'  => $request->carrera_opcion1_id,
                    'carrera_opcion2_id'  => $request->carrera_opcion2_id,
                    'carrera_asignada_id' => $carreraAsignadaId,
                    'gestion'             => date('Y'),
                    'estado_admision'     => 'EN PROCESO',
                ]);

                BitacoraService::registrar(
                    request()->header('X-User-Id'),
                    'INSERT',
                    'postulantes',
                    'Registro de postulante CI: ' . $request->ci
                );

                return response()->json([
                    'message'    => 'Postulante registrado correctamente',
                    'id'         => $postulante_id,
                    'usuario_id' => $usuario_id,
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Retorna los datos de un postulante específico por su ID.
     *
     * @param  int $id  ID del postulante
     * @return \Illuminate\Http\JsonResponse  Datos del postulante o 404
     */
    public function show($id)
    {
        $postulante = DB::table('postulantes')->where('id', $id)->first();
        if (!$postulante) return response()->json(['message' => 'No encontrado'], 404);
        return response()->json($postulante);
    }

    /**
     * Actualiza los datos personales de un postulante existente.
     * No modifica el usuario ni la postulacion asociados.
     *
     * @param  Request $request  ci*, nombres*, apellidos*, fecha_nac*, genero*, correo*
     * @param  int     $id       ID del postulante a actualizar
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        // DIAGRAMA SECUENCIA CU3 - Mensaje 1.8 [modificar]
        // UPDATE en tabla postulantes WHERE id = $id
        $request->validate([
            'ci'                  => 'required|string|unique:postulantes,ci,' . $id,
            'nombres'             => 'required|string',
            'apellidos'           => 'required|string',
            'fecha_nac'           => 'required|date',
            'genero'              => 'required|in:M,F,O',
            'correo'              => 'required|email|unique:postulantes,correo,' . $id,
        ]);

        DB::table('postulantes')->where('id', $id)->update([
            'ci'                  => $request->ci,
            'nombres'             => $request->nombres,
            'apellidos'           => $request->apellidos,
            'fecha_nac'           => $request->fecha_nac,
            'genero'              => $request->genero,
            'telefono'            => $request->telefono,
            'correo'              => $request->correo,
            'direccion'           => $request->direccion,
            'colegio_procedencia' => $request->colegio_procedencia,
            'ciudad'              => $request->ciudad,
        ]);

        BitacoraService::registrar(
            request()->header('X-User-Id'),
            'UPDATE',
            'postulantes',
            'Modificación de postulante ID: ' . $id
        );

        return response()->json(['message' => 'Postulante actualizado']);
    }

    /**
     * Elimina un postulante y todos sus registros dependientes en cascada.
     *
     * Orden de eliminación (respeta FK de PostgreSQL):
     * notas → grupo_postulantes → pagos → documentos_postulantes
     * → postulaciones → postulante → usuario (si existe usuario_id)
     *
     * @param  int $id  ID del postulante a eliminar
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        // DIAGRAMA SECUENCIA CU3 - Mensaje 1.8 [eliminar]
        // DELETE en cascada: notas → grupo_postulantes →
        // pagos → documentos → postulaciones → postulantes → usuarios
        $postulante = DB::table('postulantes')->where('id', $id)->first();
        if (!$postulante) {
            return response()->json(['message' => 'Postulante no encontrado'], 404);
        }

        $postulaciones = DB::table('postulaciones')
            ->where('postulante_id', $id)
            ->pluck('id');

        if ($postulaciones->count() > 0) {
            DB::table('notas')
                ->whereIn('postulacion_id', $postulaciones)
                ->delete();
            DB::table('grupo_postulantes')
                ->whereIn('postulacion_id', $postulaciones)
                ->delete();
            DB::table('pagos')
                ->whereIn('postulacion_id', $postulaciones)
                ->delete();
            DB::table('documentos_postulantes')
                ->whereIn('postulacion_id', $postulaciones)
                ->delete();
            DB::table('postulaciones')
                ->where('postulante_id', $id)
                ->delete();
        }

        DB::table('postulantes')->where('id', $id)->delete();

        if ($postulante->usuario_id) {
            DB::table('usuarios')->where('id', $postulante->usuario_id)->delete();
        }

        BitacoraService::registrar(
            request()->header('X-User-Id'),
            'DELETE',
            'postulantes',
            'Eliminación de postulante ID: ' . $id
        );

        return response()->json(['message' => 'Postulante eliminado correctamente']);
    }

    /**
     * Retorna estadísticas de postulantes: total, contadores por estado y top 5 ciudades.
     *
     * @return \Illuminate\Http\JsonResponse  { total_postulantes, aprobados, reprobados,
     *                                          en_proceso, ciudades (top 5) }
     */
    public function estadisticas()
    {
        $gestion = date('Y');

        $total = DB::table('postulantes')->count();

        $byEstado = DB::table('postulaciones')
            ->where('gestion', $gestion)
            ->selectRaw("estado_admision, COUNT(*) as total")
            ->groupBy('estado_admision')
            ->pluck('total', 'estado_admision');

        $ciudades = DB::table('postulantes')
            ->selectRaw("COALESCE(ciudad, 'Sin ciudad') as ciudad, COUNT(*) as total")
            ->groupBy('ciudad')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        return response()->json([
            'total_postulantes' => $total,
            'aprobados'         => $byEstado['APROBADO']    ?? 0,
            'reprobados'        => $byEstado['REPROBADO']   ?? 0,
            'en_proceso'        => $byEstado['EN PROCESO']  ?? 0,
            'ciudades'          => $ciudades,
        ]);
    }

    /**
     * Busca postulantes por CI, nombres o apellidos (búsqueda ILIKE de PostgreSQL).
     * También incluye el grupo_nombre via LEFT JOIN igual que index().
     *
     * @param  Request $request  Parámetro 'q' de búsqueda
     * @return \Illuminate\Http\JsonResponse  Array de postulantes coincidentes
     */
    // DIAGRAMA SECUENCIA CU3 - Mensaje 1.8 [buscar]
    // SELECT WHERE ci ILIKE o nombres ILIKE criterio
    public function search(Request $request)
    {
        $q       = $request->query('q');
        $gestion = date('Y');
        $postulantes = DB::table('postulantes as p')
            ->leftJoin('postulaciones as po', function ($join) use ($gestion) {
                $join->on('po.postulante_id', '=', 'p.id')
                     ->where('po.gestion', '=', $gestion);
            })
            ->leftJoin('grupo_postulantes as gp', 'gp.postulacion_id', '=', 'po.id')
            ->leftJoin('grupos as g', 'g.id', '=', 'gp.grupo_id')
            ->select('p.*', 'g.nombre as grupo_nombre')
            ->where(function ($query) use ($q) {
                $query->where('p.ci', 'ilike', "%$q%")
                      ->orWhere('p.nombres', 'ilike', "%$q%")
                      ->orWhere('p.apellidos', 'ilike', "%$q%");
            })
            ->orderBy('p.id', 'desc')
            ->get();
        return response()->json($postulantes);
    }
}