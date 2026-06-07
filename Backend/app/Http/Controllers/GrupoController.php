<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\BitacoraService;

/**
 * CU10 - GESTIONAR GRUPOS
 * Diagrama de Secuencia:
 * Actor → «UI» ModuloGrupos → «CC» GrupoController
 *      → «S» AlgoritmoDistribucion → «E» BDGrupos
 *
 * 1.4: calcularCantidadGrupos(CEIL(1001/70) = 15)
 * 1.6: distribuirPostulantes(round-robin, maxPorGrupo: 70)
 * 1.8: asignarAulaYHorario(turno: manana/tarde/noche)
 * 1.12: mostrarResumen(totalInscritos, gruposHabilitados, estudiantesPorGrupo)
 *
 * Controlador de generación y consulta de grupos de estudio.
 * Fórmula: cantidadGrupos = CEIL(totalInscritos / 70) — máximo 70 por grupo.
 * Turnos: 0=mañana (horarios 0-3), 1=tarde (4-7), 2=noche (8-11)
 */
class GrupoController extends Controller
{
    /**
     * Lista los grupos de una gestión con aula, horario, turno y total de estudiantes.
     * También calcula cuántos grupos serían necesarios (CEIL(inscritos/70)).
     *
     * @param  Request $request  Parámetro opcional 'gestion' (default: año actual)
     * @return \Illuminate\Http\JsonResponse  { grupos, total_inscritos, grupos_necesarios, gestion }
     */
    public function index(Request $request)
    {
        $gestion = $request->query('gestion', date('Y'));

        $grupos = DB::table('grupos')
            ->leftJoin('aulas', 'grupos.aula_id', '=', 'aulas.id')
            ->leftJoin('horarios', 'grupos.horario_id', '=', 'horarios.id')
            ->leftJoin(
                DB::raw('(SELECT grupo_id, COUNT(*) as total FROM grupo_postulantes GROUP BY grupo_id) as gp'),
                'grupos.id', '=', 'gp.grupo_id'
            )
            ->select(
                'grupos.id',
                'grupos.nombre',
                'grupos.gestion',
                'aulas.nombre as aula',
                DB::raw("TO_CHAR(horarios.horario_ini, 'HH24:MI') as horario_ini"),
                DB::raw("TO_CHAR(horarios.horario_fin, 'HH24:MI') as horario_fin"),
                'horarios.dias',
                DB::raw('COALESCE(gp.total, 0) as total_estudiantes'),
                DB::raw("
                    CASE
                        WHEN horarios.horario_ini < '12:00:00'::time THEN 'Manana'
                        WHEN horarios.horario_ini < '18:00:00'::time THEN 'Tarde'
                        ELSE 'Noche'
                    END as turno
                ")
            )
            ->where('grupos.gestion', $gestion)
            ->orderBy('grupos.nombre')
            ->get();

        $totalInscritos = DB::table('postulaciones')->where('gestion', $gestion)->count();
        $gruposNecesarios = $totalInscritos > 0 ? (int) ceil($totalInscritos / 70) : 0;

        return response()->json([
            'grupos'            => $grupos,
            'total_inscritos'   => $totalInscritos,
            'grupos_necesarios' => $gruposNecesarios,
            'gestion'           => $gestion,
        ]);
    }

    /**
     * Previsualiza cuántos grupos se necesitarían sin crear ninguno.
     * Útil para que el administrador planifique antes de ejecutar la generación.
     * Fórmula: gruposNecesarios = CEIL(totalInscritos / 70)
     *
     * @param  Request $request  Parámetro opcional 'gestion'
     * @return \Illuminate\Http\JsonResponse  { total_inscritos, grupos_necesarios, capacidad_por_grupo }
     */
    public function calcular(Request $request)
    {
        $gestion = $request->query('gestion', date('Y'));

        $totalInscritos = DB::table('postulaciones')->where('gestion', $gestion)->count();
        $gruposNecesarios = $totalInscritos > 0 ? (int) ceil($totalInscritos / 70) : 0;

        return response()->json([
            'total_inscritos'    => $totalInscritos,
            'grupos_necesarios'  => $gruposNecesarios,
            'capacidad_por_grupo' => 70,
            'gestion'            => $gestion,
        ]);
    }

    /**
     * Genera grupos automáticamente para una gestión, eliminando los anteriores.
     *
     * Dentro de DB::transaction():
     * 1. Elimina en cascada: asignaciones_docentes → grupo_postulantes → grupos (gestión actual)
     * 2. Carga aulas y horarios disponibles
     * 3. Crea grupos con asignación por bloques de turno (mañana/tarde/noche)
     *    usando índice de turno = floor(i / porTurno) y horarioIndex = turno*4 + pos%4
     * 4. Distribuye postulantes en round-robin: postulacion[i] → grupo[i % cantidadGrupos]
     * Retorna detalle con aula_id y horario_id de cada grupo creado para verificación.
     *
     * @param  Request $request  Parámetro opcional 'gestion' (default: año actual)
     * @return \Illuminate\Http\JsonResponse  { message, total_inscritos, grupos_creados, detalle }
     */
    public function asignar(Request $request)
    {
        $gestion = $request->input('gestion', date('Y'));

        // Obtener todas las postulaciones de la gestión
        $postulaciones = DB::table('postulaciones')
            ->where('gestion', $gestion)
            ->pluck('id')
            ->toArray();

        $total = count($postulaciones);

        if ($total === 0) {
            return response()->json(['message' => 'No hay postulaciones para la gestión ' . $gestion], 422);
        }

        $cantidadGrupos = (int) ceil($total / 70);

        $detalleGrupos = DB::transaction(function () use ($gestion, $postulaciones, $cantidadGrupos) {
            // Eliminar asignaciones previas de grupos de esta gestión
            $gruposExistentes = DB::table('grupos')
                ->where('gestion', $gestion)
                ->pluck('id')
                ->toArray();

            if (!empty($gruposExistentes)) {
                DB::table('asignaciones_docentes')
                    ->whereIn('grupo_id', $gruposExistentes)
                    ->delete();
                DB::table('grupo_postulantes')
                    ->whereIn('grupo_id', $gruposExistentes)
                    ->delete();
                DB::table('grupos')->whereIn('id', $gruposExistentes)->delete();
            }

            $aulas    = DB::table('aulas')->orderBy('id')->get()->values();
            $horarios = DB::table('horarios')->orderBy('id')->get()->values();
            $totalGrupos = $cantidadGrupos;

            // Distribuir grupos en 3 turnos: mañana, tarde, noche
            // Cada turno usa hasta 4 horarios consecutivos del arreglo
            $porTurno = (int) ceil($totalGrupos / 3);

            $gruposCreados = [];
            $detalle = [];

            for ($i = 0; $i < $totalGrupos; $i++) {
                $turnoIndex  = (int) floor($i / $porTurno); // 0=mañana, 1=tarde, 2=noche
                $posEnTurno  = $i % $porTurno;

                $horarioIndex = ($turnoIndex * 4) + ($posEnTurno % 4);
                if ($horarioIndex >= $horarios->count()) {
                    $horarioIndex = $horarios->count() - 1;
                }

                $aulaIndex = $i % $aulas->count();
                $aula      = $aulas->get($aulaIndex);
                $horario   = $horarios->get($horarioIndex);

                $grupoId = DB::table('grupos')->insertGetId([
                    'nombre'     => 'Grupo ' . ($i + 1),
                    'gestion'    => $gestion,
                    'aula_id'    => $aula->id,
                    'horario_id' => $horario->id,
                ]);

                $gruposCreados[] = $grupoId;
                $detalle[] = [
                    'grupo'      => 'Grupo ' . ($i + 1),
                    'aula_id'    => $aula->id,
                    'horario_id' => $horario->id,
                ];
            }

            // Asignar postulantes de forma equitativa (round-robin)
            $pivots = [];
            foreach ($postulaciones as $index => $postulacionId) {
                $grupoId = $gruposCreados[$index % $cantidadGrupos];
                $pivots[] = [
                    'grupo_id'       => $grupoId,
                    'postulacion_id' => $postulacionId,
                ];
            }

            foreach (array_chunk($pivots, 500) as $chunk) {
                DB::table('grupo_postulantes')->insert($chunk);
            }

            return $detalle;
        });

        BitacoraService::registrar(
            request()->header('X-User-Id'),
            'INSERT',
            'grupos',
            'Generación automática de grupos gestión: ' . $gestion
        );

        return response()->json([
            'message'         => "Grupos generados correctamente para la gestión $gestion",
            'total_inscritos' => $total,
            'grupos_creados'  => $cantidadGrupos,
            'detalle'         => $detalleGrupos,
        ], 201);
    }

    public function show($id)
    {
        $grupo = DB::table('grupos')
            ->leftJoin('aulas', 'grupos.aula_id', '=', 'aulas.id')
            ->leftJoin('horarios', 'grupos.horario_id', '=', 'horarios.id')
            ->select(
                'grupos.id',
                'grupos.nombre',
                'grupos.gestion',
                'aulas.nombre as aula',
                DB::raw("TO_CHAR(horarios.horario_ini, 'HH24:MI') as horario_ini"),
                DB::raw("TO_CHAR(horarios.horario_fin, 'HH24:MI') as horario_fin"),
                'horarios.dias'
            )
            ->where('grupos.id', $id)
            ->first();

        if (!$grupo) return response()->json(['message' => 'Grupo no encontrado'], 404);

        $estudiantes = DB::table('grupo_postulantes')
            ->join('postulaciones', 'grupo_postulantes.postulacion_id', '=', 'postulaciones.id')
            ->join('postulantes', 'postulaciones.postulante_id', '=', 'postulantes.id')
            ->select(
                'postulantes.ci',
                'postulantes.nombres',
                'postulantes.apellidos',
                'postulaciones.id as postulacion_id',
                'postulaciones.gestion',
                'postulaciones.estado_admision'
            )
            ->where('grupo_postulantes.grupo_id', $id)
            ->orderBy('postulantes.apellidos')
            ->get();

        return response()->json([
            'grupo'       => $grupo,
            'estudiantes' => $estudiantes,
            'total'       => $estudiantes->count(),
        ]);
    }
}
