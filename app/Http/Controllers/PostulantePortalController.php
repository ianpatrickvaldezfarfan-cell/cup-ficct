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

        $grupoPostulante = DB::table('grupo_postulantes')
            ->where('postulacion_id', $postulacion->id)
            ->first();

        if (!$grupoPostulante) return response()->json(['grupo' => null]);

        $grupo = DB::table('grupos as g')
            ->leftJoin('aulas as a', 'a.id', '=', 'g.aula_id')
            ->leftJoin('horarios as h', 'h.id', '=', 'g.horario_id')
            ->where('g.id', $grupoPostulante->grupo_id)
            ->select(
                'g.id',
                'g.nombre',
                'g.gestion',
                'a.nombre as aula_nombre',
                'a.capacidad as aula_capacidad',
                DB::raw("TO_CHAR(h.horario_ini, 'HH24:MI') as horario_ini"),
                DB::raw("TO_CHAR(h.horario_fin, 'HH24:MI') as horario_fin"),
                'h.dias'
            )
            ->first();

        if (!$grupo) return response()->json(['grupo' => null]);

        $totalCompaneros = DB::table('grupo_postulantes')
            ->where('grupo_id', $grupoPostulante->grupo_id)
            ->count();

        $numeroEnGrupo = DB::table('grupo_postulantes')
            ->where('grupo_id', $grupoPostulante->grupo_id)
            ->where('postulacion_id', '<=', $postulacion->id)
            ->count();

        $docentesMaterias = DB::table('asignaciones_docentes as ad')
            ->join('docentes as d', 'd.id', '=', 'ad.docente_id')
            ->join('materias as m', 'm.id', '=', 'ad.materia_id')
            ->leftJoin('aulas as a', 'a.id', '=', 'ad.aula_id')
            ->where('ad.grupo_id', $grupoPostulante->grupo_id)
            ->select(
                'm.nombre as materia',
                'd.nombres as docente_nombres',
                'd.apellidos as docente_apellidos',
                'a.nombre as aula_materia'
            )
            ->orderBy('m.nombre')
            ->get();

        $carrera = $postulacion->carrera_asignada_id
            ? DB::table('carreras')->where('id', $postulacion->carrera_asignada_id)->first()
            : null;

        return response()->json([
            'grupo'             => $grupo,
            'total_companeros'  => $totalCompaneros,
            'numero_en_grupo'   => $numeroEnGrupo,
            'docentes_materias' => $docentesMaterias,
            'estado_admision'   => $postulacion->estado_admision,
            'carrera_asignada'  => $carrera ? $carrera->nombre : 'En proceso',
            'gestion'           => $postulacion->gestion,
            'turno_preferido'   => $postulacion->turno_preferido ?? 'manana',
        ]);
    }

    public function cambiarPassword(Request $request)
    {
        $request->validate([
            'password_actual'       => 'required|string',
            'password_nueva'        => 'required|string|min:8',
            'password_confirmacion' => 'required|string',
        ]);

        $userId  = $request->header('X-User-Id');
        $usuario = DB::table('usuarios')->where('id', $userId)->first();

        if (!$usuario) {
            return response()->json(['success' => false, 'mensaje' => 'Usuario no encontrado'], 404);
        }

        if ($request->password_actual !== $usuario->password) {
            return response()->json(['success' => false, 'mensaje' => 'La contraseña actual es incorrecta'], 422);
        }

        if ($request->password_nueva !== $request->password_confirmacion) {
            return response()->json(['success' => false, 'mensaje' => 'Las contraseñas no coinciden'], 422);
        }

        $pwd = $request->password_nueva;
        $cumple = strlen($pwd) >= 8
            && preg_match('/[A-Z]/', $pwd)
            && preg_match('/[a-z]/', $pwd)
            && preg_match('/[0-9]/', $pwd)
            && preg_match('/[@#$%&*!]/', $pwd);

        if (!$cumple) {
            return response()->json(['success' => false, 'mensaje' => 'La nueva contraseña no cumple los requisitos de seguridad'], 422);
        }

        DB::table('usuarios')->where('id', $userId)->update([
            'password'       => $pwd,
            'password_texto' => $pwd,
        ]);

        BitacoraService::registrar($userId, 'UPDATE', 'usuarios', 'Cambio de contraseña por el usuario');

        return response()->json(['success' => true, 'mensaje' => 'Contraseña actualizada correctamente']);
    }
}
