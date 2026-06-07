<?php
namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

/**
 * CU13 - GENERAR REPORTES Y DASHBOARD
 * Diagrama de Secuencia - FLUJO 1 (Dashboard tiempo real):
 * Actor → «UI» PanelDashboard → «CC» DashboardController → «E» BDSistema
 *
 * Mensajes del diagrama:
 * 1: solicitarDashboard()
 * 1.1: cargarIndicadores(gestion: 2026)
 * 1.2: consultarEstadisticas(totalInscritos, totalAprobados,
 *      totalReprobados, totalGrupos, gestion)
 * 1.3: [indicadores: inscritos=1001, aprobados=X, reprobados=X, grupos=15]
 * 1.4: mostrarDashboard(totalInscritos, totalAprobados,
 *      totalReprobados, totalGruposHabilitados)
 *
 * Diagrama de Secuencia - FLUJO 2 (Generación reportes):
 * 2: solicitarReporte(tipo: Postulantes/Docentes/Examenes/Grupos,
 *    formato: pantalla/CSV/PDF)
 * 2.1: procesarSolicitudReporte(tipo, filtros)
 * 2.2: consultarDatosReporte(gestion: 2026)
 * 2.3: [datosReporte]
 * 2.4: generarReporte(datos, tipo, formato)
 * 2.5.1: [si formato CSV] generarCSV(datos, BOM: UTF-8)
 * 2.5.2: [si formato PDF] generarPDF(datos, jsPDF + autotable)
 * 2.6: mostrarReporte(datos) / descargarArchivo(CSV/PDF)
 *
 * Controlador del panel de estadisticas del Dashboard.
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
