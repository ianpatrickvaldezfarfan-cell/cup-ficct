<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\BitacoraService;

/**
 * CU12 - GESTIONAR NOTAS
 * Diagrama de Secuencia - FLUJO 1 (Administrador/Docente registra):
 * Actor → «UI» ModuloExamenes → «CC» ExamenController
 *      → «S» CalculadorNotas → «E» Notas/Postulaciones
 *
 * Mensajes del diagrama:
 * 1: buscarPostulante(ci) - Actor → UI
 * 1.1: obtenerPostulantePorCI(ci) - UI → Controller
 * 1.2: consultarPostulante(ci) - Controller → BD
 * 1.3: [datosPostulante, postulacion_id]
 * 1.4: mostrarMaterias(Computacion, Matematicas, Ingles, Fisica)
 * 1.5: registrarNotas(postulacion_id, materia_id, nota1, nota2, nota3)
 * 1.6: procesarNotas(postulacion_id, materia_id, nota1, nota2, nota3)
 * 1.7: calcularPromedio((nota1+nota2+nota3)/3) - Controller → CalculadorNotas
 * 1.8: [promedio_materia]
 * 1.9: verificarAprobacion(todas_materias >= 60 AND promedio_global >= 60)
 * 1.10: [APROBADO / REPROBADO]
 * 1.11: guardarNotas() + actualizarPostulacion(estado_admision)
 * 1.12: [notasGuardadas]
 * 1.13: mostrarResultado(promedio, estado_materia, promedio_global, estado_admision)
 *
 * Diagrama de Secuencia - FLUJO 2 (Postulante consulta):
 * 2: consultarNotas(ci) - Postulante → UI
 * 2.1: obtenerNotasPorCI(ci)
 * 2.2: obtenerNotas(postulacion_id)
 * 2.3: [notas: Computacion, Matematicas, Ingles, Fisica]
 * 2.4: mostrarCalificaciones(materia, nota1, nota2, nota3,
 *      promedio, estado_materia, promedio_global, estado_admision)
 *
 * Controlador de gestión de exámenes y notas del curso preuniversitario.
 * Maneja el registro y actualización de las 3 notas por materia.
 * Regla de evaluación: nota_final = (nota1+nota2+nota3)/3 (GENERATED en PostgreSQL)
 * Si TODAS las materias >= 60 → APROBADO | Si CUALQUIER materia < 60 → REPROBADO
 */
class ExamenController extends Controller
{
    /**
     * Lista todas las notas con datos del postulante y materia asociada.
     *
     * @return \Illuminate\Http\JsonResponse  Array de notas ordenadas por apellido y materia
     */
    public function index()
    {
        $notas = DB::table('notas')
            ->join('postulaciones', 'notas.postulacion_id', '=', 'postulaciones.id')
            ->join('postulantes', 'postulaciones.postulante_id', '=', 'postulantes.id')
            ->join('materias', 'notas.materia_id', '=', 'materias.id')
            ->select(
                'notas.id',
                'notas.postulacion_id',
                'notas.materia_id',
                'notas.nota1',
                'notas.nota2',
                'notas.nota3',
                'notas.nota_final',
                'notas.estado_materia',
                'postulantes.ci',
                'postulantes.nombres',
                'postulantes.apellidos',
                'materias.nombre as materia'
            )
            ->orderBy('postulantes.apellidos')
            ->orderBy('materias.nombre')
            ->get();

        return response()->json($notas);
    }

    /**
     * Registra las 3 notas de una materia para una postulación.
     *
     * Valida que no exista ya una nota para la misma materia+postulación.
     * Tras insertar, llama a actualizarEstadoAdmision() que recalcula si el
     * postulante está APROBADO o REPROBADO según todas sus materias.
     * nota_final = (nota1+nota2+nota3)/3 la calcula PostgreSQL automáticamente.
     *
     * @param  Request $request  postulacion_id*, materia_id*, nota1*, nota2*, nota3* (0-100)
     * @return \Illuminate\Http\JsonResponse  { message, id } (201) o 422 si ya existe
     */
    public function store(Request $request)
    {
        // DIAGRAMA SECUENCIA CU12 - Mensajes 1.7, 1.9, 1.11
        // 1.7: Calcular promedio = (nota1+nota2+nota3)/3 (GENERATED en PostgreSQL)
        // 1.9: Verificar aprobación - todas materias >= 60 AND global >= 60
        // 1.11: INSERT en notas + UPDATE postulaciones estado_admision
        $request->validate([
            'postulacion_id' => 'required|integer|exists:postulaciones,id',
            'materia_id'     => 'required|integer|exists:materias,id',
            'nota1'          => 'required|numeric|min:0|max:100',
            'nota2'          => 'required|numeric|min:0|max:100',
            'nota3'          => 'required|numeric|min:0|max:100',
        ]);

        $existe = DB::table('notas')
            ->where('postulacion_id', $request->postulacion_id)
            ->where('materia_id', $request->materia_id)
            ->exists();

        if ($existe) {
            return response()->json(['message' => 'Ya existe una nota para esta materia en esta postulación'], 422);
        }

        $id = DB::table('notas')->insertGetId([
            'postulacion_id' => $request->postulacion_id,
            'materia_id'     => $request->materia_id,
            'nota1'          => $request->nota1,
            'nota2'          => $request->nota2,
            'nota3'          => $request->nota3,
        ]);

        $this->actualizarEstadoAdmision($request->postulacion_id);

        BitacoraService::registrar(
            request()->header('X-User-Id'),
            'INSERT',
            'notas',
            'Registro de notas postulacion ID: ' . $request->postulacion_id
        );

        return response()->json(['message' => 'Notas registradas', 'id' => $id], 201);
    }

    public function show($id)
    {
        $notas = DB::table('notas')
            ->join('postulaciones', 'notas.postulacion_id', '=', 'postulaciones.id')
            ->join('postulantes', 'postulaciones.postulante_id', '=', 'postulantes.id')
            ->join('materias', 'notas.materia_id', '=', 'materias.id')
            ->select(
                'notas.id',
                'notas.postulacion_id',
                'notas.materia_id',
                'notas.nota1',
                'notas.nota2',
                'notas.nota3',
                'notas.nota_final',
                'notas.estado_materia',
                'postulantes.ci',
                'postulantes.nombres',
                'postulantes.apellidos',
                'materias.nombre as materia'
            )
            ->where('notas.id', $id)
            ->first();

        if (!$notas) return response()->json(['message' => 'No encontrado'], 404);
        return response()->json($notas);
    }

    /**
     * Modifica las 3 notas de un registro existente y recalcula el estado de admisión.
     *
     * @param  Request $request  nota1*, nota2*, nota3* (0-100)
     * @param  int     $id       ID del registro de notas a modificar
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'nota1' => 'required|numeric|min:0|max:100',
            'nota2' => 'required|numeric|min:0|max:100',
            'nota3' => 'required|numeric|min:0|max:100',
        ]);

        $nota = DB::table('notas')->where('id', $id)->first();
        if (!$nota) return response()->json(['message' => 'No encontrado'], 404);

        DB::table('notas')->where('id', $id)->update([
            'nota1' => $request->nota1,
            'nota2' => $request->nota2,
            'nota3' => $request->nota3,
        ]);

        $this->actualizarEstadoAdmision($nota->postulacion_id);

        BitacoraService::registrar(
            request()->header('X-User-Id'),
            'UPDATE',
            'notas',
            'Modificación de notas ID: ' . $id
        );

        return response()->json(['message' => 'Notas actualizadas']);
    }

    /**
     * Retorna estadísticas de exámenes de la gestión actual.
     * Incluye total de postulantes, cuántos tienen notas completas (≥4 materias),
     * aprobados y reprobados.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function estadisticas()
    {
        $gestion = date('Y');

        $total = DB::table('postulaciones')->where('gestion', $gestion)->count();

        $conNotasCompletas = DB::table('postulaciones')
            ->where('gestion', $gestion)
            ->whereIn('id', function ($q) {
                $q->select('postulacion_id')
                  ->from('notas')
                  ->groupBy('postulacion_id')
                  ->havingRaw('COUNT(*) >= 4');
            })
            ->count();

        $aprobados  = DB::table('postulaciones')->where('gestion', $gestion)->where('estado_admision', 'APROBADO')->count();
        $reprobados = DB::table('postulaciones')->where('gestion', $gestion)->where('estado_admision', 'REPROBADO')->count();

        return response()->json([
            'total_postulantes'   => $total,
            'con_notas_completas' => $conNotasCompletas,
            'aprobados'           => $aprobados,
            'reprobados'          => $reprobados,
        ]);
    }

    /**
     * Retorna las últimas notas registradas para mostrar en el dashboard.
     *
     * @return \Illuminate\Http\JsonResponse  Últimos 10 registros de notas con datos del postulante
     */
    public function recientes()
    {
        $recientes = DB::table('notas')
            ->join('postulaciones', 'notas.postulacion_id', '=', 'postulaciones.id')
            ->join('postulantes', 'postulaciones.postulante_id', '=', 'postulantes.id')
            ->join('materias', 'notas.materia_id', '=', 'materias.id')
            ->select(
                'postulantes.ci',
                'postulantes.nombres',
                'postulantes.apellidos',
                'materias.nombre as materia',
                'notas.nota_final',
                'notas.estado_materia'
            )
            ->orderBy('notas.id', 'desc')
            ->limit(10)
            ->get();

        return response()->json($recientes);
    }

    private function actualizarEstadoAdmision(int $postulacion_id): void
    {
        $notas = DB::table('notas')
            ->where('postulacion_id', $postulacion_id)
            ->get();

        if ($notas->count() < 4) return;

        // nota_final (GENERATED) = (n1+n2+n3)/3 → promedio de la materia
        $algunaReprobada  = $notas->contains(fn($n) => $n->nota_final < 60);
        $promedioGlobal   = $notas->sum('nota_final') / 4;

        $estado = (!$algunaReprobada && $promedioGlobal >= 60) ? 'APROBADO' : 'REPROBADO';

        DB::table('postulaciones')
            ->where('id', $postulacion_id)
            ->update(['estado_admision' => $estado]);
    }

    public function getByPostulante($valor)
    {
        // DIAGRAMA SECUENCIA CU12 - FLUJO 2 - Mensajes 2.1, 2.2, 2.3, 2.4
        // Buscar postulante por CI
        // Retornar notas de las 4 materias con promedios y estados
        $postulante = DB::table('postulantes')
            ->where('ci', $valor)
            ->first();

        if (!$postulante) {
            return response()->json(['message' => 'No se encontró ningún postulante con ese CI'], 404);
        }

        // Tomar la postulación más reciente
        $postulacion = DB::table('postulaciones')
            ->where('postulante_id', $postulante->id)
            ->orderBy('id', 'desc')
            ->first();

        if (!$postulacion) {
            return response()->json(['message' => 'El postulante no tiene postulaciones registradas'], 404);
        }

        // Notas de esa postulación
        $notas = DB::table('notas')
            ->join('materias', 'notas.materia_id', '=', 'materias.id')
            ->select(
                'notas.id',
                'notas.postulacion_id',
                'notas.materia_id',
                'notas.nota1',
                'notas.nota2',
                'notas.nota3',
                'notas.nota_final',
                'notas.estado_materia',
                'materias.nombre as materia'
            )
            ->where('notas.postulacion_id', $postulacion->id)
            ->orderBy('materias.nombre')
            ->get();

        return response()->json([
            'postulante' => [
                'id'        => $postulante->id,
                'ci'        => $postulante->ci,
                'nombres'   => $postulante->nombres,
                'apellidos' => $postulante->apellidos,
            ],
            'postulacion_id' => $postulacion->id,
            'notas'          => $notas,
        ]);
    }
}
