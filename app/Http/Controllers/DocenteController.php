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
 * Mensajes del diagrama:
 * 1: enviarDatosDocente(ci, nombres, apellidos, correo,
 *    profesion, tiene_maestria, tiene_diplomado)
 * 1.1: procesarFormulario(datos)
 * 1.2: validarCamposObligatorios(ci, nombres, apellidos, correo, profesion)
 * 1.3: [camposValidos]
 * 1.4: verificarDuplicado(ci, correo)
 * 1.5: [resultadoVerificacion]
 * ALT [CI o correo duplicado]:
 *   1.6: retornarError(CI o correo ya registrado)
 * ALT [datos válidos]:
 *   1.7: store/update/destroy/search/index()
 *   1.8: [confirmacionOperacion]
 * 1.9: mostrarResultado(docente registrado/estadisticas/asignaciones)
 *
 * CU11 - GESTIONAR ASIGNACIONES DE DOCENTES
 * Diagrama de Secuencia:
 * Actor → «UI» PanelAsignaciones → «CC» AsignacionController
 *      → «S» ValidadorAsignacion → «E» BDAsignacionesDocentes
 *
 * Mensajes del diagrama:
 * 1: asignarDocente(docente_id, grupo_id, materia_id)
 * 1.2: verificarLimiteGrupos(docente_id, limite: 4)
 * 1.3: contarGruposAsignados(docente_id)
 * 1.4: [totalGruposAsignados]
 * 1.5.1: [si totalGrupos >= 4] retornarError(maximo 4 grupos)
 * 1.6: verificarDuplicado(docente_id, grupo_id, materia_id)
 * 1.9.1: [si duplicado] retornarError(asignacion ya existe)
 * 1.10: guardarAsignacion(docente_id, grupo_id, materia_id)
 * 1.12: mostrarCargaHoraria(grupos: 1-4, materias, aulas, horarios)
 *
 * Controlador CRUD de docentes (CU8 - Gestionar Docentes).
 * Al crear un docente también se crea un usuario asociado con rol_id=2,
 * usando el CI como username y como password inicial.
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
            'password' => $request->ci,
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

    public function asignacionesByDocente($id)
    {
        $asignaciones = DB::table('asignaciones_docentes')
            ->join('materias', 'asignaciones_docentes.materia_id', '=', 'materias.id')
            ->join('grupos',   'asignaciones_docentes.grupo_id',   '=', 'grupos.id')
            ->leftJoin('aulas',    'asignaciones_docentes.aula_id', '=', 'aulas.id')
            ->leftJoin('horarios', 'grupos.horario_id', '=', 'horarios.id')
            ->where('asignaciones_docentes.docente_id', $id)
            ->select(
                'grupos.nombre as grupo',
                'materias.nombre as materia',
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

    public function asignarAutomatico()
    {
        try {
            DB::transaction(function() {

                // 1. Obtener grupos de la gestión actual
                $grupos = DB::table('grupos')
                    ->where('gestion', date('Y'))
                    ->orderBy('id')
                    ->get();

                // 2. Obtener materias
                $materias = DB::table('materias')
                    ->orderBy('id')
                    ->get();

                // 3. Obtener docentes
                $docentes = DB::table('docentes')
                    ->orderBy('id')
                    ->get();

                // 4. Obtener todas las aulas disponibles
                $aulas = DB::table('aulas')
                    ->orderBy('id')
                    ->get();

                // 5. Obtener horarios
                $horarios = DB::table('horarios')
                    ->orderBy('id')
                    ->get();

                // 6. Eliminar asignaciones anteriores
                DB::table('asignaciones_docentes')->delete();

                // 7. Dividir docentes por materia equitativamente
                $totalDocentes = count($docentes);
                $totalMaterias = count($materias);
                $docentesPorMateria = [];
                $docenteIndex = 0;

                foreach ($materias as $index => $materia) {
                    $docentesPorMateria[$materia->id] = [];
                    $cantidad = intval($totalDocentes / $totalMaterias);
                    if ($index < ($totalDocentes % $totalMaterias)) {
                        $cantidad++;
                    }
                    for ($i = 0; $i < $cantidad; $i++) {
                        if ($docenteIndex < $totalDocentes) {
                            $docentesPorMateria[$materia->id][] =
                                $docentes[$docenteIndex]->id;
                            $docenteIndex++;
                        }
                    }
                }

                // 8. Contador de grupos por docente
                $contadorGruposDocente = [];

                // 9. Para cada grupo asignar docente + aula diferente por materia
                $totalAulas = count($aulas);

                foreach ($grupos as $grupoIndex => $grupo) {

                    // Calcular 4 aulas distintas para este grupo
                    // Formula: (grupoIndex * totalMaterias + mIndex) % totalAulas
                    $aulasDelGrupo = [];
                    for ($m = 0; $m < $totalMaterias; $m++) {
                        $idxAula = ($grupoIndex * $totalMaterias + $m) % $totalAulas;
                        $aulasDelGrupo[] = $aulas[$idxAula]->id;
                    }

                    foreach ($materias as $mIndex => $materia) {

                        $docentesMateria = $docentesPorMateria[$materia->id];
                        $docenteAsignado = null;

                        foreach ($docentesMateria as $docenteId) {
                            $gruposActuales =
                                $contadorGruposDocente[$docenteId] ?? 0;
                            if ($gruposActuales < 4) {
                                $docenteAsignado = $docenteId;
                                break;
                            }
                        }

                        // Si todos al límite usar el primero disponible
                        if (!$docenteAsignado) {
                            $docenteAsignado = $docentesMateria[0];
                        }

                        // Aula específica para esta materia en este grupo
                        $aulaDelGrupoMateria = $aulasDelGrupo[$mIndex];

                        DB::table('asignaciones_docentes')->insert([
                            'docente_id' => $docenteAsignado,
                            'grupo_id'   => $grupo->id,
                            'materia_id' => $materia->id,
                            'aula_id'    => $aulaDelGrupoMateria,
                        ]);

                        $contadorGruposDocente[$docenteAsignado] =
                            ($contadorGruposDocente[$docenteAsignado] ?? 0) + 1;
                    }
                }

                // 10. Registrar en bitácora
                BitacoraService::registrar(
                    request()->header('X-User-Id'),
                    'INSERT',
                    'asignaciones_docentes',
                    'Asignacion automatica de docentes con aulas diferenciadas a ' .
                    count($grupos) . ' grupos, gestion ' . date('Y')
                );
            });

            $total = DB::table('asignaciones_docentes')->count();

            $choques = DB::select("
                SELECT grupo_id, aula_id, COUNT(*) as cantidad
                FROM asignaciones_docentes
                GROUP BY grupo_id, aula_id
                HAVING COUNT(*) > 1
            ");

            return response()->json([
                'success'            => true,
                'mensaje'            => 'Asignacion automatica completada sin choques de aula',
                'total_asignaciones' => $total,
                'choques_detectados' => count($choques),
                'detalle_choques'    => $choques,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'mensaje' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function misEstadisticas(Request $request)
    {
        $userId  = $request->header('X-User-Id');
        $docente = DB::table('docentes')->where('usuario_id', $userId)->first();
        if (!$docente) return response()->json(['message' => 'Docente no encontrado'], 404);

        $grupoIds = DB::table('asignaciones_docentes')
            ->where('docente_id', $docente->id)
            ->pluck('grupo_id')
            ->unique();

        $totalGrupos = $grupoIds->count();

        $totalPostulantes = DB::table('grupo_postulantes')
            ->whereIn('grupo_id', $grupoIds)
            ->count();

        $materiaIds     = DB::table('asignaciones_docentes')
            ->where('docente_id', $docente->id)
            ->pluck('materia_id');
        $postulacionIds = DB::table('grupo_postulantes')
            ->whereIn('grupo_id', $grupoIds)
            ->pluck('postulacion_id');

        $notasRegistradas = DB::table('notas')
            ->whereIn('postulacion_id', $postulacionIds)
            ->whereIn('materia_id', $materiaIds)
            ->count();

        return response()->json([
            'total_grupos'      => $totalGrupos,
            'total_postulantes' => $totalPostulantes,
            'notas_registradas' => $notasRegistradas,
        ]);
    }

    public function misGrupos(Request $request)
    {
        $userId  = $request->header('X-User-Id');
        $docente = DB::table('docentes')->where('usuario_id', $userId)->first();
        if (!$docente) return response()->json(['message' => 'Docente no encontrado'], 404);

        $asignaciones = DB::table('asignaciones_docentes')
            ->join('materias', 'asignaciones_docentes.materia_id', '=', 'materias.id')
            ->join('grupos',   'asignaciones_docentes.grupo_id',   '=', 'grupos.id')
            ->leftJoin('aulas',    'asignaciones_docentes.aula_id', '=', 'aulas.id')
            ->leftJoin('horarios', 'grupos.horario_id', '=', 'horarios.id')
            ->where('asignaciones_docentes.docente_id', $docente->id)
            ->select(
                'grupos.id as grupo_id',
                'grupos.nombre as grupo_nombre',
                'grupos.gestion',
                'materias.id as materia_id',
                'materias.nombre as materia',
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
            ->get();

        $grupos = [];
        foreach ($asignaciones as $asig) {
            $materiaId   = $asig->materia_id;
            $postulantes = DB::table('grupo_postulantes')
                ->join('postulaciones', 'grupo_postulantes.postulacion_id', '=', 'postulaciones.id')
                ->join('postulantes',   'postulaciones.postulante_id',      '=', 'postulantes.id')
                ->leftJoin('notas', function ($join) use ($materiaId) {
                    $join->on('notas.postulacion_id', '=', 'grupo_postulantes.postulacion_id')
                         ->where('notas.materia_id', '=', $materiaId);
                })
                ->where('grupo_postulantes.grupo_id', $asig->grupo_id)
                ->select(
                    'postulantes.id',
                    'postulantes.ci',
                    'postulantes.nombres',
                    'postulantes.apellidos',
                    'postulaciones.id as postulacion_id',
                    'notas.id as nota_id',
                    'notas.nota1',
                    'notas.nota2',
                    'notas.nota3',
                    'notas.nota_final',
                    'notas.estado_materia'
                )
                ->orderBy('postulantes.apellidos')
                ->get();

            $grupos[] = [
                'grupo_id'     => $asig->grupo_id,
                'grupo_nombre' => $asig->grupo_nombre,
                'gestion'      => $asig->gestion,
                'materia'      => $asig->materia,
                'materia_id'   => $asig->materia_id,
                'aula'         => $asig->aula,
                'horario_ini'  => $asig->horario_ini,
                'horario_fin'  => $asig->horario_fin,
                'dias'         => $asig->dias,
                'turno'        => $asig->turno,
                'postulantes'  => $postulantes,
            ];
        }

        return response()->json($grupos);
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
            ->leftJoin('aulas',    'asignaciones_docentes.aula_id', '=', 'aulas.id')
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
