<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\BitacoraService;

/**
 * Portal del postulante autenticado (CU3/CU4/CU5/CU6/CU12 - vista propia).
 *
 * Todos los métodos identifican al postulante via header X-User-Id,
 * garantizando que cada usuario solo accede a su propia información.
 */
class PostulantePortalController extends Controller
{
    private function resolverPostulante($userId)
    {
        return DB::table('postulantes')->where('usuario_id', $userId)->first();
    }

    private function resolverPostulacion($postulanteId)
    {
        return DB::table('postulaciones')
            ->where('postulante_id', $postulanteId)
            ->orderBy('id', 'desc')
            ->first();
    }

    public function miResumen(Request $request)
    {
        $userId     = $request->header('X-User-Id');
        $postulante = $this->resolverPostulante($userId);
        if (!$postulante) return response()->json(['message' => 'No encontrado'], 404);

        $postulacion = $this->resolverPostulacion($postulante->id);

        $carreras = DB::table('carreras')->pluck('nombre', 'id');

        $grupoNombre = null;
        $totalNotas  = 0;

        if ($postulacion) {
            $gp = DB::table('grupo_postulantes')
                ->join('grupos', 'grupo_postulantes.grupo_id', '=', 'grupos.id')
                ->where('grupo_postulantes.postulacion_id', $postulacion->id)
                ->select('grupos.nombre as grupo_nombre')
                ->first();
            $grupoNombre = $gp ? $gp->grupo_nombre : null;

            $totalNotas = DB::table('notas')
                ->where('postulacion_id', $postulacion->id)
                ->count();
        }

        return response()->json([
            'nombres'           => $postulante->nombres,
            'apellidos'         => $postulante->apellidos,
            'estado_admision'   => $postulacion->estado_admision ?? 'Sin postulación',
            'carrera_asignada'  => ($postulacion && $postulacion->carrera_asignada_id)
                                    ? ($carreras[$postulacion->carrera_asignada_id] ?? 'No asignada')
                                    : 'No asignada',
            'grupo_nombre'      => $grupoNombre ?? 'Sin grupo',
            'notas_registradas' => $totalNotas,
        ]);
    }

    public function misDatos(Request $request)
    {
        $userId     = $request->header('X-User-Id');
        $postulante = $this->resolverPostulante($userId);
        if (!$postulante) return response()->json(['message' => 'No encontrado'], 404);
        return response()->json($postulante);
    }

    public function actualizarDatos(Request $request)
    {
        $userId     = $request->header('X-User-Id');
        $postulante = $this->resolverPostulante($userId);
        if (!$postulante) return response()->json(['message' => 'No encontrado'], 404);

        $request->validate([
            'nombres'   => 'required|string',
            'apellidos' => 'required|string',
            'telefono'  => 'nullable|string',
            'correo'    => 'required|email|unique:postulantes,correo,' . $postulante->id,
            'direccion' => 'nullable|string',
            'ciudad'    => 'nullable|string',
        ]);

        DB::table('postulantes')->where('id', $postulante->id)->update([
            'nombres'   => $request->nombres,
            'apellidos' => $request->apellidos,
            'telefono'  => $request->telefono,
            'correo'    => $request->correo,
            'direccion' => $request->direccion,
            'ciudad'    => $request->ciudad,
        ]);

        DB::table('usuarios')->where('id', $userId)->update([
            'correo' => $request->correo,
        ]);

        BitacoraService::registrar(
            $userId, 'UPDATE', 'postulantes',
            'Postulante actualizó sus datos personales ID: ' . $postulante->id
        );

        return response()->json(['message' => 'Datos actualizados correctamente']);
    }

    public function miPostulacion(Request $request)
    {
        $userId     = $request->header('X-User-Id');
        $postulante = $this->resolverPostulante($userId);
        if (!$postulante) return response()->json(['message' => 'No encontrado'], 404);

        $postulacion = DB::table('postulaciones as p')
            ->leftJoin('carreras as c1', 'p.carrera_opcion1_id',  '=', 'c1.id')
            ->leftJoin('carreras as c2', 'p.carrera_opcion2_id',  '=', 'c2.id')
            ->leftJoin('carreras as ca', 'p.carrera_asignada_id', '=', 'ca.id')
            ->where('p.postulante_id', $postulante->id)
            ->orderBy('p.id', 'desc')
            ->select(
                'p.*',
                'c1.nombre as carrera_opcion1',
                'c2.nombre as carrera_opcion2',
                'ca.nombre as carrera_asignada'
            )
            ->first();

        if (!$postulacion) return response()->json(['message' => 'Sin postulación'], 404);
        return response()->json($postulacion);
    }

    public function misDocumentos(Request $request)
    {
        $userId     = $request->header('X-User-Id');
        $postulante = $this->resolverPostulante($userId);
        if (!$postulante) return response()->json(['postulacion_id' => null, 'documentos' => []]);

        $postulacion = $this->resolverPostulacion($postulante->id);
        if (!$postulacion) return response()->json(['postulacion_id' => null, 'documentos' => []]);

        $documentos = DB::table('documentos_postulantes')
            ->where('postulacion_id', $postulacion->id)
            ->get();

        return response()->json([
            'postulacion_id' => $postulacion->id,
            'documentos'     => $documentos,
        ]);
    }

    public function miPago(Request $request)
    {
        $userId     = $request->header('X-User-Id');
        $postulante = $this->resolverPostulante($userId);
        if (!$postulante) return response()->json(null);

        $postulacion = $this->resolverPostulacion($postulante->id);
        if (!$postulacion) return response()->json(null);

        $pago = DB::table('pagos')
            ->where('postulacion_id', $postulacion->id)
            ->first();

        return response()->json($pago);
    }

    public function misNotas(Request $request)
    {
        $userId     = $request->header('X-User-Id');
        $postulante = $this->resolverPostulante($userId);
        if (!$postulante) return response()->json(['notas' => [], 'promedio_global' => null]);

        $postulacion = $this->resolverPostulacion($postulante->id);
        if (!$postulacion) return response()->json(['notas' => [], 'promedio_global' => null, 'estado_admision' => null]);

        $materias = DB::table('materias')->orderBy('id')->get();

        $notasReg = DB::table('notas')
            ->join('materias', 'notas.materia_id', '=', 'materias.id')
            ->where('notas.postulacion_id', $postulacion->id)
            ->select('notas.*', 'materias.nombre as materia')
            ->get()
            ->keyBy('materia_id');

        $resultado = $materias->map(function ($m) use ($notasReg) {
            $n = $notasReg->get($m->id);
            return [
                'materia_id'     => $m->id,
                'materia'        => $m->nombre,
                'nota1'          => $n->nota1 ?? null,
                'nota2'          => $n->nota2 ?? null,
                'nota3'          => $n->nota3 ?? null,
                'nota_final'     => $n->nota_final ?? null,
                'estado_materia' => $n->estado_materia ?? null,
            ];
        });

        $promedioGlobal = $notasReg->count() > 0
            ? round($notasReg->avg('nota_final'), 2)
            : null;

        return response()->json([
            'notas'           => $resultado,
            'promedio_global' => $promedioGlobal,
            'estado_admision' => $postulacion->estado_admision,
            'total_notas'     => $notasReg->count(),
        ]);
    }

    public function miGrupo(Request $request)
    {
        $userId     = $request->header('X-User-Id');
        $postulante = $this->resolverPostulante($userId);
        if (!$postulante) return response()->json(null);

        $postulacion = $this->resolverPostulacion($postulante->id);
        if (!$postulacion) return response()->json(null);

        $grupoInfo = DB::table('grupo_postulantes')
            ->join('grupos',    'grupo_postulantes.grupo_id', '=', 'grupos.id')
            ->leftJoin('aulas',    'grupos.aula_id',    '=', 'aulas.id')
            ->leftJoin('horarios', 'grupos.horario_id', '=', 'horarios.id')
            ->where('grupo_postulantes.postulacion_id', $postulacion->id)
            ->select(
                'grupos.id as grupo_id',
                'grupos.nombre as grupo_nombre',
                'grupos.gestion',
                'aulas.nombre as aula',
                DB::raw("TO_CHAR(horarios.horario_ini, 'HH24:MI') as horario_ini"),
                DB::raw("TO_CHAR(horarios.horario_fin, 'HH24:MI') as horario_fin"),
                'horarios.dias',
                DB::raw("
                    CASE
                        WHEN horarios.horario_ini < '12:00:00'::time THEN 'Mañana'
                        WHEN horarios.horario_ini < '18:00:00'::time THEN 'Tarde'
                        ELSE 'Noche'
                    END as turno
                ")
            )
            ->first();

        if (!$grupoInfo) return response()->json(null);

        $docentes = DB::table('asignaciones_docentes')
            ->join('docentes',  'asignaciones_docentes.docente_id',  '=', 'docentes.id')
            ->join('materias',  'asignaciones_docentes.materia_id',  '=', 'materias.id')
            ->leftJoin('aulas', 'asignaciones_docentes.aula_id',     '=', 'aulas.id')
            ->where('asignaciones_docentes.grupo_id', $grupoInfo->grupo_id)
            ->select(
                'materias.nombre as materia',
                DB::raw("docentes.nombres || ' ' || docentes.apellidos as docente"),
                'aulas.nombre as aula'
            )
            ->orderBy('materias.nombre')
            ->get();

        return response()->json([
            'grupo'   => $grupoInfo,
            'docentes' => $docentes,
        ]);
    }
}
