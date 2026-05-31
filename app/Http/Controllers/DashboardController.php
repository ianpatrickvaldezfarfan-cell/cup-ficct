<?php
namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

/**
 * Controlador del panel de estadisticas del Dashboard.
 *
 * Provee los datos de resumen de la gestion actual para las tarjetas del
 * panel administrativo: inscritos, aprobados, reprobados y grupos activos.
 */
class DashboardController extends Controller
{
    /**
     * Retorna estadisticas generales filtradas por la gestion actual (anio en curso).
     *
     * Consulta la tabla postulaciones para contar inscritos, aprobados y reprobados,
     * y la tabla grupos para contar los grupos generados en la gestion actual.
     *
     * @return \Illuminate\Http\JsonResponse  { total_inscritos, total_aprobados,
     *                                          total_reprobados, total_grupos, gestion }
     */
    public function estadisticas()
    {
        $gestion = date('Y');

        $totalInscritos = DB::table('postulaciones')
            ->where('gestion', $gestion)
            ->count();

        $totalAprobados = DB::table('postulaciones')
            ->where('gestion', $gestion)
            ->where('estado_admision', 'APROBADO')
            ->count();

        $totalReprobados = DB::table('postulaciones')
            ->where('gestion', $gestion)
            ->where('estado_admision', 'REPROBADO')
            ->count();

        $totalGrupos = DB::table('grupos')
            ->where('gestion', $gestion)
            ->count();

        return response()->json([
            'total_inscritos'  => $totalInscritos,
            'total_aprobados'  => $totalAprobados,
            'total_reprobados' => $totalReprobados,
            'total_grupos'     => $totalGrupos,
            'gestion'          => $gestion,
        ]);
    }
}
