<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CU14 - ADMINISTRAR BITÁCORA
 * Diagrama de Secuencia - FLUJO 1 (Administrador consulta):
 * Administrador → «UI» PanelBitacora → «CC» BitacoraController → «E» BDBitacora
 *
 * Mensajes del diagrama:
 * 1: consultarHistorial(filtros: usuario, fecha, accion, tabla_afectada)
 * 1.1: procesarConsulta(filtros)
 * 1.2: buscarRegistros(usuario_id, accion, tabla_afectada, fecha_hora)
 * 1.3: [listaRegistrosBitacora]
 * 1.4: mostrarHistorial(usuario, accion, tabla_afectada,
 *      descripcion, fecha_hora, direccion_ip)
 *
 * Diagrama de Secuencia - FLUJO 2 (Sistema registra automático):
 * Sistema → «S» ServicioBitacora → «E» BDBitacora
 *
 * 2: eventoSistema(INSERT/UPDATE/DELETE)
 * 2.1: insertarRegistro(usuario_id, accion, tabla_afectada,
 *      descripcion, fecha_hora, direccion_ip)
 * 2.2: [registroGuardado]
 *
 * Controlador del modulo de Bitacora (CU14 - Administrar Bitacora).
 * Expone endpoints para consultar el historial de auditoria del sistema.
 * Los registros son creados automaticamente por BitacoraService desde
 * los demas controladores; este controlador solo los muestra y filtra.
 */
class BitacoraController extends Controller
{
    /**
     * Lista los 100 registros mas recientes de la bitacora.
     *
     * Realiza LEFT JOIN con usuarios y roles para mostrar el nombre de usuario
     * y su rol junto a cada evento. El limite de 100 evita sobrecargar el frontend.
     *
     * @return \Illuminate\Http\JsonResponse  Array de registros con username y rol
     */
    public function index()
    {
        $registros = DB::table('bitacora as b')
            ->leftJoin('usuarios as u', 'b.usuario_id', '=', 'u.id')
            ->leftJoin('roles as r', 'u.rol_id', '=', 'r.id')
            ->select('b.*', 'u.username', 'r.nombre as rol')
            ->orderBy('b.fecha_hora', 'desc')
            ->limit(100)
            ->get();

        return response()->json($registros);
    }

    /**
     * Filtra la bitacora por multiples criterios opcionales.
     *
     * Todos los parametros son opcionales. Si no se envian, retorna los 100
     * registros mas recientes sin filtro adicional.
     *
     * @param  Request $request  Parametros opcionales: usuario_id, accion,
     *                           tabla_afectada, fecha_desde (YYYY-MM-DD), fecha_hasta (YYYY-MM-DD)
     * @return \Illuminate\Http\JsonResponse  Array de registros filtrados (max 100)
     */
    public function filtrar(Request $request)
    {
        $query = DB::table('bitacora as b')
            ->leftJoin('usuarios as u', 'b.usuario_id', '=', 'u.id')
            ->leftJoin('roles as r', 'u.rol_id', '=', 'r.id')
            ->select('b.*', 'u.username', 'r.nombre as rol');

        if ($request->filled('usuario_id')) {
            $query->where('b.usuario_id', $request->usuario_id);
        }
        if ($request->filled('accion')) {
            $query->where('b.accion', $request->accion);
        }
        if ($request->filled('tabla_afectada')) {
            $query->where('b.tabla_afectada', $request->tabla_afectada);
        }
        if ($request->filled('fecha_desde')) {
            $query->whereDate('b.fecha_hora', '>=', $request->fecha_desde);
        }
        if ($request->filled('fecha_hasta')) {
            $query->whereDate('b.fecha_hora', '<=', $request->fecha_hasta);
        }

        $registros = $query->orderBy('b.fecha_hora', 'desc')->limit(100)->get();
        return response()->json($registros);
    }

    /**
     * Retorna estadisticas agregadas de la bitacora.
     *
     * Calcula: total de registros, registros del dia actual, distribucion de
     * acciones por tipo (INSERT/UPDATE/DELETE/LOGIN/LOGOUT) y top 5 tablas
     * mas afectadas por operaciones de escritura.
     *
     * @return \Illuminate\Http\JsonResponse  { total_registros, registros_hoy,
     *                                          acciones_por_tipo, tablas_mas_afectadas }
     */
    public function estadisticas()
    {
        $total = DB::table('bitacora')->count();

        $hoy = DB::table('bitacora')
            ->whereDate('fecha_hora', today())
            ->count();

        $accionesPorTipo = DB::table('bitacora')
            ->selectRaw('accion, COUNT(*) as total')
            ->groupBy('accion')
            ->pluck('total', 'accion');

        $tablasMasAfectadas = DB::table('bitacora')
            ->selectRaw('tabla_afectada, COUNT(*) as total')
            ->whereNotNull('tabla_afectada')
            ->groupBy('tabla_afectada')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        return response()->json([
            'total_registros'      => $total,
            'registros_hoy'        => $hoy,
            'acciones_por_tipo'    => $accionesPorTipo,
            'tablas_mas_afectadas' => $tablasMasAfectadas,
        ]);
    }
}
