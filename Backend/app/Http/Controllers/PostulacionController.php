<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CU4 - GESTIONAR POSTULACIONES
 * Diagrama de Secuencia:
 * Actor → «UI» ModuloPostulaciones → «CC» PostulacionController
 *      → «E» Carreras → «E» Postulaciones
 *
 * Mensajes del diagrama:
 * 1: registrarPostulacion(postulante_id, carrera_opcion1_id,
 *    carrera_opcion2_id, gestion) - Actor → UI
 * 1.1: procesarPostulacion(datos) - UI → Controller
 * 1.2: verificarCuposOpcion1(carrera_opcion1_id) - Controller → Carreras
 * 1.3: [cuposDisponibles/cuposAgotados] - Carreras → Controller
 * ALT [cupos disponibles en opción 1]:
 *   1.4: guardarPostulacion(carrera_opcion1, EN PROCESO)
 *   1.5: [postulacionRegistrada]
 * ALT [cupos agotados en opción 1]:
 *   1.4: verificarCuposOpcion2(carrera_opcion2_id)
 *   1.5: [cuposDisponibles opcion2]
 *   1.6: guardarPostulacion(carrera_opcion2, EN PROCESO)
 *   1.7: [postulacionRegistrada]
 * 1.8: actualizarEstadoAdmision(APROBADO/REPROBADO)
 * 1.9: [estadoActualizado]
 * 1.10: mostrarEstadoAdmision() - Controller → UI → Actor
 *
 * Controlador de postulaciones (CU4 - Gestionar Postulaciones).
 * Implementa la logica de negocio para registrar postulaciones con verificacion
 * atomica de cupos. Usa lockForUpdate() para evitar condiciones de carrera cuando
 * multiples postulantes intentan inscribirse simultaneamente a la misma carrera.
 * Almacena carrera_asignada_id para saber exactamente cual carrera fue asignada,
 * independientemente de si se uso la opcion 1 o la opcion 2.
 */
class PostulacionController extends Controller
{
    /**
     * Resuelve cual carrera asignar segun disponibilidad de cupos.
     *
     * IMPORTANTE: Debe llamarse DENTRO de un DB::transaction().
     * Usa lockForUpdate() para bloquear el registro de carrera durante la verificacion,
     * garantizando atomicidad y evitando race conditions en inscripciones concurrentes.
     *
     * Logica: si opcion1 tiene cupos -> decrementa y retorna opcion1Id.
     *         si no, verifica opcion2  -> decrementa y retorna opcion2Id.
     *         si ninguna tiene cupos   -> lanza Exception (rollback automatico).
     *
     * @param  int $opcion1Id  ID de la carrera primera opcion
     * @param  int $opcion2Id  ID de la carrera segunda opcion
     * @return int             ID de la carrera efectivamente asignada
     * @throws \Exception      Si ninguna carrera tiene cupos disponibles
     */
    private function resolverCarrera(int $opcion1Id, int $opcion2Id): int
    {
        $c1 = DB::table('carreras')->lockForUpdate()->where('id', $opcion1Id)->first();
        if ($c1 && $c1->cupos_disponibles > 0) {
            DB::table('carreras')->where('id', $opcion1Id)->decrement('cupos_disponibles');
            return $opcion1Id;
        }

        $c2 = DB::table('carreras')->lockForUpdate()->where('id', $opcion2Id)->first();
        if ($c2 && $c2->cupos_disponibles > 0) {
            DB::table('carreras')->where('id', $opcion2Id)->decrement('cupos_disponibles');
            return $opcion2Id;
        }

        throw new \Exception('No hay cupos disponibles en ninguna de las carreras seleccionadas.');
    }

    /**
     * Lista todas las postulaciones con datos del postulante y carreras.
     *
     * Usa COALESCE(carrera_asignada, carrera_opcion1) para compatibilidad con
     * registros anteriores que no tienen carrera_asignada_id definida.
     *
     * @return \Illuminate\Http\JsonResponse  Array de postulaciones ordenadas por apellido
     */
    public function index()
    {
        $postulaciones = DB::table('postulaciones')
            ->join('postulantes', 'postulaciones.postulante_id', '=', 'postulantes.id')
            ->leftJoin('carreras as c1', 'postulaciones.carrera_opcion1_id', '=', 'c1.id')
            ->leftJoin('carreras as c2', 'postulaciones.carrera_opcion2_id', '=', 'c2.id')
            ->leftJoin('carreras as ca', 'postulaciones.carrera_asignada_id', '=', 'ca.id')
            ->select(
                'postulaciones.id',
                'postulaciones.postulante_id',
                'postulaciones.gestion',
                'postulaciones.estado_admision',
                'postulaciones.carrera_asignada_id',
                'postulantes.ci',
                'postulantes.nombres',
                'postulantes.apellidos',
                'c1.nombre as carrera_opcion1',
                'c2.nombre as carrera_opcion2',
                DB::raw("COALESCE(ca.nombre, c1.nombre) as carrera_asignada")
            )
            ->orderBy('postulantes.apellidos')
            ->get();

        return response()->json($postulaciones);
    }

    /**
     * Registra una nueva postulacion con verificacion atomica de cupos.
     *
     * Llama a resolverCarrera() dentro de DB::transaction() para garantizar
     * que el decremento de cupos y la insercion sean atomicos.
     * Retorna la postulacion creada con el nombre de la carrera asignada.
     *
     * @param  Request $request  postulante_id*, carrera_opcion1_id*, carrera_opcion2_id*, gestion
     * @return \Illuminate\Http\JsonResponse  Postulacion creada (201) o error 422 si sin cupos
     */
    public function store(Request $request)
    {
        $request->validate([
            'postulante_id'      => 'required|integer|exists:postulantes,id',
            'carrera_opcion1_id' => 'required|integer|exists:carreras,id',
            'carrera_opcion2_id' => 'required|integer|exists:carreras,id|different:carrera_opcion1_id',
            'gestion'            => 'nullable|string',
        ]);

        try {
            $postulacion = DB::transaction(function () use ($request) {
                $carreraAsignadaId = $this->resolverCarrera(
                    $request->carrera_opcion1_id,
                    $request->carrera_opcion2_id
                );

                $id = DB::table('postulaciones')->insertGetId([
                    'postulante_id'       => $request->postulante_id,
                    'carrera_opcion1_id'  => $request->carrera_opcion1_id,
                    'carrera_opcion2_id'  => $request->carrera_opcion2_id,
                    'carrera_asignada_id' => $carreraAsignadaId,
                    'gestion'             => $request->gestion ?? date('Y'),
                    'estado_admision'     => 'EN PROCESO',
                ]);

                return DB::table('postulaciones')
                    ->leftJoin('carreras as ca', 'postulaciones.carrera_asignada_id', '=', 'ca.id')
                    ->where('postulaciones.id', $id)
                    ->select('postulaciones.*', 'ca.nombre as carrera_asignada')
                    ->first();
            });

            return response()->json($postulacion, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function show($id)
    {
        $postulacion = DB::table('postulaciones')
            ->join('postulantes', 'postulaciones.postulante_id', '=', 'postulantes.id')
            ->leftJoin('carreras as c1', 'postulaciones.carrera_opcion1_id', '=', 'c1.id')
            ->leftJoin('carreras as c2', 'postulaciones.carrera_opcion2_id', '=', 'c2.id')
            ->leftJoin('carreras as ca', 'postulaciones.carrera_asignada_id', '=', 'ca.id')
            ->select(
                'postulaciones.*',
                'postulantes.ci',
                'postulantes.nombres',
                'postulantes.apellidos',
                'postulantes.correo',
                'c1.nombre as carrera_opcion1',
                'c2.nombre as carrera_opcion2',
                DB::raw("COALESCE(ca.nombre, c1.nombre) as carrera_asignada")
            )
            ->where('postulaciones.id', $id)
            ->first();

        if (!$postulacion) {
            return response()->json(['message' => 'Postulación no encontrada'], 404);
        }

        return response()->json($postulacion);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'carrera_opcion1_id' => 'sometimes|integer|exists:carreras,id',
            'carrera_opcion2_id' => 'sometimes|integer|exists:carreras,id',
            'gestion'            => 'sometimes|string',
        ]);

        DB::table('postulaciones')->where('id', $id)
            ->update($request->only(['carrera_opcion1_id', 'carrera_opcion2_id', 'gestion']));

        return response()->json(['message' => 'Postulación actualizada']);
    }

    /**
     * Actualiza el estado_admision de una postulacion manualmente.
     *
     * Estados validos: EN PROCESO, APROBADO, REPROBADO, PENDIENTE_PAGO.
     * Usado desde el panel de Postulaciones del administrador.
     *
     * @param  Request $request  estado_admision* (uno de los valores permitidos)
     * @param  int     $id       ID de la postulacion a actualizar
     * @return \Illuminate\Http\JsonResponse
     */
    public function actualizarEstado(Request $request, $id)
    {
        $request->validate([
            'estado_admision' => 'required|in:EN PROCESO,APROBADO,REPROBADO,PENDIENTE_PAGO',
        ]);

        $updated = DB::table('postulaciones')
            ->where('id', $id)
            ->update(['estado_admision' => $request->estado_admision]);

        if (!$updated) {
            return response()->json(['message' => 'Postulación no encontrada'], 404);
        }

        return response()->json(['message' => 'Estado actualizado correctamente']);
    }

    public function getByPostulante($postulante_id)
    {
        $postulaciones = DB::table('postulaciones')
            ->leftJoin('carreras as c1', 'postulaciones.carrera_opcion1_id', '=', 'c1.id')
            ->leftJoin('carreras as c2', 'postulaciones.carrera_opcion2_id', '=', 'c2.id')
            ->leftJoin('carreras as ca', 'postulaciones.carrera_asignada_id', '=', 'ca.id')
            ->where('postulaciones.postulante_id', $postulante_id)
            ->select(
                'postulaciones.*',
                'c1.nombre as carrera_opcion1',
                'c2.nombre as carrera_opcion2',
                DB::raw("COALESCE(ca.nombre, c1.nombre) as carrera_asignada")
            )
            ->orderBy('postulaciones.gestion', 'desc')
            ->get();

        return response()->json($postulaciones);
    }
}
