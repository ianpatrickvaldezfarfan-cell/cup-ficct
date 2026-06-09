<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use App\Services\BitacoraService;
use App\Helpers\PasswordHelper;

/**
 * CU5 - GESTIONAR DOCUMENTOS DE POSTULANTES
 * Diagrama de Secuencia:
 * Postulante → «UI» ModuloDocumentos → «CC» RegistroController
 *           → «S» ServidorArchivos → «E» DocumentosPostulantes
 *
 * Mensajes del diagrama:
 * 1: adjuntarDocumento(tipo, archivo) - Postulante → UI
 * 1.1: procesarDocumento(postulacion_id, tipo, archivo)
 * ALT [formato inválido: no es PDF/JPG/PNG]:
 *   1.6: retornarError(formato no permitido)
 *   1.6b: mostrarError(formato no permitido)
 * ALT [tamaño excedido: mayor a 5MB]:
 *   1.7: retornarError(archivo demasiado grande)
 *   1.7b: mostrarError(archivo demasiado grande)
 * ALT [archivo válido]:
 *   1.2: almacenarArchivo(archivo) - Controller → ServidorArchivos
 *   1.3: [urlArchivo] - ServidorArchivos → Controller
 *   1.4: registrarDocumento(postulacion_id, tipo, urlArchivo)
 *   1.5: [documentoRegistrado]
 *   1.8: mostrarConfirmacion(documento adjuntado correctamente)
 *
 * CU6 - GESTIONAR PAGOS
 * Diagrama de Secuencia:
 * Postulante → «UI» PasarelaPago → «CC» RegistroController
 *           → «E» Pagos → «E» Usuarios
 *
 * Mensajes del diagrama:
 * 1: iniciarPago(postulacion_id, concepto, monto: Bs. 700)
 * 1.1: procesarPago(postulacion_id, monto, concepto)
 * 1.2: enviarTransaccion(monto, datos) - Controller → Pagos
 * 1.3: [referenciaTransaccion]
 * ALT [pago PENDIENTE]:
 *   1.6: bloquearAvanceInscripcion()
 *   1.8: mostrarEstadoPago(PENDIENTE)
 * ALT [pago COMPLETADO]:
 *   1.4: registrarPago(postulacion_id, concepto, monto,
 *        fecha, referencia, estado: COMPLETADO)
 *   1.5: [pagoRegistrado]
 *   1.7b: crearUsuario(username=correo, password=CI)
 *   1.7c: actualizarPostulacion(estado: EN PROCESO)
 *
 * Controlador del flujo de registro publico de postulantes (3 pasos).
 * Implementa el proceso de auto-inscripcion sin intervencion del administrador:
 * - paso1:  Datos personales + verificacion de cupos + postulacion(PENDIENTE_PAGO)
 * - paso1b: Subida de documentos requeridos al storage del servidor
 * - paso2:  Confirmacion de pago + creacion de usuario + credenciales de acceso
 * Los tres pasos estan vinculados por postulacion_id retornado en paso1
 * y enviado como parametro en paso1b y paso2.
 */
class RegistroController extends Controller
{
    /**
     * Retorna el catalogo de carreras disponibles para los selects del formulario.
     *
     * @return \Illuminate\Http\JsonResponse  Array de { id, nombre, cupos_disponibles }
     */
    public function carreras()
    {
        $carreras = DB::table('carreras')
            ->select('id', 'nombre', 'cupos_disponibles')
            ->orderBy('nombre')
            ->get();
        return response()->json($carreras);
    }

    /**
     * Paso 1: Recibe datos personales del postulante, verifica cupos y crea los registros base.
     *
     * Dentro de DB::transaction():
     * 1. Verifica cupos con lockForUpdate() (opcion1, luego opcion2 si sin cupos)
     * 2. Decrementa cupos_disponibles de la carrera asignada
     * 3. INSERT en postulantes (sin usuario_id aun, se crea en paso2)
     * 4. INSERT en postulaciones con estado_admision='PENDIENTE_PAGO'
     *
     * Retorna postulacion_id para pasar a los siguientes pasos del flujo.
     *
     * @param  Request $request  Campos del postulante + carrera_opcion1_id + carrera_opcion2_id
     * @return \Illuminate\Http\JsonResponse  { postulacion_id, nombres, apellidos, monto: 700 }
     * @throws \Exception  Si no hay cupos disponibles en ninguna carrera (rollback automatico)
     */
    public function paso1(Request $request)
    {
        $request->validate([
            'ci'                  => 'required|string|unique:postulantes,ci',
            'nombres'             => 'required|string',
            'apellidos'           => 'required|string',
            'fecha_nac'           => 'required|date',
            'genero'              => 'required|in:M,F,O',
            'telefono'            => 'nullable|string',
            'correo'              => 'required|email|unique:postulantes,correo|unique:usuarios,correo',
            'direccion'           => 'nullable|string',
            'ciudad'              => 'nullable|string',
            'colegio_procedencia' => 'nullable|string',
            'carrera_opcion1_id'  => 'required|integer|exists:carreras,id',
            'carrera_opcion2_id'  => 'required|integer|exists:carreras,id|different:carrera_opcion1_id',
            'turno_preferido'     => 'required|in:manana,tarde,noche',
        ]);

        try {
            $result = DB::transaction(function () use ($request) {
                // Verificar cupos y reservar carrera
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

                $postulante_id = DB::table('postulantes')->insertGetId([
                    'ci'                  => $request->ci,
                    'nombres'             => $request->nombres,
                    'apellidos'           => $request->apellidos,
                    'fecha_nac'           => $request->fecha_nac,
                    'genero'              => $request->genero,
                    'telefono'            => $request->telefono,
                    'correo'              => $request->correo,
                    'direccion'           => $request->direccion,
                    'ciudad'              => $request->ciudad,
                    'colegio_procedencia' => $request->colegio_procedencia,
                ]);

                $postulacion_id = DB::table('postulaciones')->insertGetId([
                    'postulante_id'       => $postulante_id,
                    'carrera_opcion1_id'  => $request->carrera_opcion1_id,
                    'carrera_opcion2_id'  => $request->carrera_opcion2_id,
                    'carrera_asignada_id' => $carreraAsignadaId,
                    'gestion'             => date('Y'),
                    'estado_admision'     => 'PENDIENTE_PAGO',
                    'turno_preferido'     => $request->turno_preferido,
                ]);

                return [
                    'postulacion_id' => $postulacion_id,
                    'nombres'        => $request->nombres,
                    'apellidos'      => $request->apellidos,
                    'monto'          => 700,
                ];
            });

            return response()->json($result, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Paso 1b: Recibe y almacena los 4 documentos requeridos para la postulacion.
     *
     * Guarda cada archivo en storage/app/public/documentos/{postulacion_id}/
     * con nombre estandarizado (ej: certificado_nacimiento.pdf).
     * Hace UPDATE en documentos_postulantes SET url = ruta_publica.
     * El symlink public/storage debe existir (php artisan storage:link).
     *
     * Tipos de archivo aceptados: pdf, jpg, jpeg, png (max 5MB cada uno).
     *
     * @param  Request $request  postulacion_id*, documento_0 a documento_3 (files)
     * @return \Illuminate\Http\JsonResponse  { success: true, mensaje }
     */
    public function paso1b(Request $request)
    {
        // DIAGRAMA SECUENCIA CU5 - Mensajes 1.1, 1.2, 1.3, 1.4, 1.5
        // Validar formato (mimes:pdf,jpg,jpeg,png) → Mensaje ALT válido
        // Validar tamaño máximo 5MB → Mensaje ALT tamaño excedido
        // Almacenar en storage/documentos/{postulacion_id}/
        // UPDATE documentos_postulantes SET url = ruta_archivo
        $request->validate([
            'postulacion_id' => 'required|integer|exists:postulaciones,id',
            'documento_0'    => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'documento_1'    => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'documento_2'    => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'documento_3'    => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $postulacionId = $request->postulacion_id;
        $folder        = "documentos/{$postulacionId}";

        $tipos = [
            'documento_0' => ['tipo' => 'Certificado de Nacimiento', 'nombre' => 'certificado_nacimiento'],
            'documento_1' => ['tipo' => 'CI Anverso/Reverso',        'nombre' => 'ci_anverso_reverso'],
            'documento_2' => ['tipo' => 'Fotografía Fondo Rojo',     'nombre' => 'fotografia_fondo_rojo'],
            'documento_3' => ['tipo' => 'Título de Bachiller',       'nombre' => 'titulo_bachiller'],
        ];

        foreach ($tipos as $key => $meta) {
            $file     = $request->file($key);
            $ext      = $file->getClientOriginalExtension();
            $filename = $meta['nombre'] . '.' . $ext;

            Storage::disk('public')->putFileAs($folder, $file, $filename);

            $url = 'storage/' . $folder . '/' . $filename;

            DB::table('documentos_postulantes')
                ->where('postulacion_id', $postulacionId)
                ->where('tipo', $meta['tipo'])
                ->update(['url' => $url]);

            // Si el documento aún no existe (primera vez), insertar
            if (DB::table('documentos_postulantes')
                    ->where('postulacion_id', $postulacionId)
                    ->where('tipo', $meta['tipo'])
                    ->doesntExist()) {
                DB::table('documentos_postulantes')->insert([
                    'postulacion_id' => $postulacionId,
                    'tipo'           => $meta['tipo'],
                    'url'            => $url,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'mensaje' => 'Documentos subidos correctamente.',
        ]);
    }

    public function paso2(Request $request)
    {
        // DIAGRAMA SECUENCIA CU6 - Mensajes 1.4, 1.5, 1.7b, 1.7c
        // INSERT en pagos con estado COMPLETADO
        // Generar credenciales: username=inicial+apellidos, password=aleatorio
        // INSERT en usuarios (rol_id=3)
        // UPDATE postulaciones SET estado_admision = EN PROCESO
        $request->validate(['postulacion_id' => 'required|integer|exists:postulaciones,id']);

        $postulacion = DB::table('postulaciones')->where('id', $request->postulacion_id)->first();
        $postulante  = DB::table('postulantes')->where('id', $postulacion->postulante_id)->first();

        $result = DB::transaction(function () use ($postulacion, $postulante) {
            // 1. Registrar pago
            DB::table('pagos')->insertGetId([
                'postulacion_id'      => $postulacion->id,
                'concepto'            => 'Inscripción Curso Preuniversitario 2026',
                'monto'               => 700.00,
                'estado'              => 'COMPLETADO',
                'pasarela_referencia' => 'REF-' . str_pad($postulacion->id, 6, '0', STR_PAD_LEFT) . '-2026',
                'fecha'               => now(),
            ]);

            // 2. Generar username: inicial nombre + apellidos sin espacios
            $base     = strtolower(substr($postulante->nombres, 0, 1) . str_replace(' ', '', $postulante->apellidos));
            $username = $base;
            $n        = 1;
            while (DB::table('usuarios')->where('username', $username)->exists()) {
                $username = $base . $n++;
            }

            // 3. Generar password seguro (8 chars: mayus + minus + nums + especiales)
            $password = PasswordHelper::generar();

            // 4. Crear usuario
            $usuarioId = DB::table('usuarios')->insertGetId([
                'rol_id'         => 3,
                'username'       => $username,
                'password'       => $password,
                'password_texto' => $password,
                'correo'         => $postulante->correo,
                'estado'         => true,
                'created_at'     => now(),
            ]);

            // 5. Vincular usuario al postulante
            DB::table('postulantes')->where('id', $postulante->id)->update(['usuario_id' => $usuarioId]);

            // 6. Actualizar estado de postulación
            DB::table('postulaciones')->where('id', $postulacion->id)->update(['estado_admision' => 'EN PROCESO']);

            return [
                'username' => $username,
                'password' => $password,
                'mensaje'  => 'Registro completado. Guarda tus credenciales de acceso.',
            ];
        });

        return response()->json($result);
    }

    /**
     * Registro público de docentes.
     * Verifica que la profesión tenga relación con las materias del CUP.
     * Si cumple: crea usuario (rol_id=2) y docente, devuelve credenciales.
     * Si no cumple: envía correo de rechazo y devuelve 422.
     */
    public function registroDocente(Request $request)
    {
        $request->validate([
            'ci'              => 'required|string',
            'nombres'         => 'required|string',
            'apellidos'       => 'required|string',
            'correo'          => 'required|email',
            'profesion'       => 'required|string',
            'tiene_maestria'  => 'boolean',
            'tiene_diplomado' => 'boolean',
        ]);

        // Palabras clave aceptadas — incluye formas con y sin acento
        $palabrasAceptadas = [
            // COMPUTACIÓN / SISTEMAS / INFORMÁTICA
            'computacion','computación','sistemas','informatica','informática',
            'software','programacion','programación','tecnologia','tecnología',
            'redes','telecomunicaciones','electronica','electrónica',
            'robotica','robótica','ciberseguridad','datos','inteligencia',
            'artificial','developer','desarrollo','web','movil','móvil',
            'ingeniero','ingeniería','ingenieria','licenciado','licenciada',
            'tecnico','técnico','tecnica','técnica',
            // MATEMÁTICAS
            'matematica','matemática','matematicas','matemáticas',
            'estadistica','estadística','calculo','cálculo',
            'algebra','álgebra','actuaria','actuaría','actuario',
            'contabilidad','contador','contadora','economia','economía',
            'economista','finanzas','financiero','financiera',
            'industrial','civil','arquitecto','arquitectura','arquitecta',
            // INGLÉS / IDIOMAS
            'ingles','inglés','idiomas','idioma','linguistica','lingüística',
            'linguístico','filologia','filología','letras','comunicacion',
            'comunicación','comunicador','comunicadora','traduccion','traducción',
            'traductor','traductora','bilingue','bilingüe','english',
            'literatura','literato','humanidades','humanista',
            'profesor','profesora','docente','educacion','educación',
            'pedagogia','pedagogía','pedagogo','pedagoga',
            // FÍSICA / CIENCIAS
            'fisica','física','quimica','química','ciencias','ciencia',
            'laboratorio','investigacion','investigación','investigador','investigadora',
            'astrofisica','astrofísica','mecanica','mecánica','mecanico','mecánico',
            'electromecanica','electromecánica','biologia','biología','biologo','biólogo',
            'ambiental','quimico','químico','geologia','geología','geologo','geólogo',
            'astronomo','astrónomo','astronomia','astronomía',
        ];

        // Función de normalización: minúsculas + quitar acentos
        $normalizar = function ($texto) {
            return strtr(strtolower($texto), [
                'á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u','ñ'=>'n',
                'Á'=>'a','É'=>'e','Í'=>'i','Ó'=>'o','Ú'=>'u','Ü'=>'u','Ñ'=>'n',
            ]);
        };

        $profesionNorm   = $normalizar($request->profesion);
        $palabrasProfesion = explode(' ', $profesionNorm);

        $cumple = false;

        // Paso 1: verificar palabra por palabra de la profesión
        foreach ($palabrasProfesion as $palabraProf) {
            if (strlen($palabraProf) < 4) continue;
            foreach ($palabrasAceptadas as $aceptada) {
                $aceptadaNorm = $normalizar($aceptada);
                if (str_contains($palabraProf, $aceptadaNorm) ||
                    str_contains($aceptadaNorm, $palabraProf)) {
                    $cumple = true;
                    break 2;
                }
            }
        }

        // Paso 2: verificar la profesión completa como cadena
        if (!$cumple) {
            foreach ($palabrasAceptadas as $aceptada) {
                if (str_contains($profesionNorm, $normalizar($aceptada))) {
                    $cumple = true;
                    break;
                }
            }
        }

        if (!$cumple) {
            $asunto  = 'CUP-FICCT — Solicitud de Registro Docente';
            $cuerpo  = "Estimado/a {$request->nombres} {$request->apellidos},\n\n"
                . "Gracias por su interés en formar parte del equipo docente del CUP de la FICCT.\n\n"
                . "Lamentablemente, luego de evaluar su solicitud, su profesión "
                . "'{$request->profesion}' no cumple con los requisitos establecidos "
                . "para las materias que se imparten:\n\n"
                . "• Computación e Informática\n• Matemáticas\n• Inglés\n• Física\n\n"
                . "Los docentes deben ser profesionales en áreas relacionadas con esas materias.\n\n"
                . "Si considera que su perfil sí cumple los requisitos, comuníquese con la administración.\n\n"
                . "Atentamente,\nAdministración CUP-FICCT\nfcctcup@uagrm.edu.bo";

            try {
                Mail::raw($cuerpo, function ($msg) use ($request, $asunto) {
                    $msg->to($request->correo)
                        ->subject($asunto)
                        ->from('fcctcup@uagrm.edu.bo', 'CUP-FICCT');
                });
            } catch (\Exception $e) { /* Fallo de correo no bloquea la respuesta */ }

            return response()->json([
                'success'            => false,
                'cumple_requisitos'  => false,
                'correo'             => $request->correo,
                'mensaje'            => 'Tu profesión no cumple con los requisitos para las materias del CUP. '
                                      . 'Se ha enviado un correo a ' . $request->correo . ' con más información.',
            ], 422);
        }

        // Verificar duplicados antes de la transacción
        if (DB::table('docentes')->where('ci', $request->ci)->exists()) {
            return response()->json(['success' => false, 'mensaje' => 'Ya existe un docente con ese CI.'], 422);
        }
        if (DB::table('usuarios')->where('correo', $request->correo)->exists()) {
            return response()->json(['success' => false, 'mensaje' => 'Ya existe un usuario con ese correo.'], 422);
        }

        DB::beginTransaction();
        try {
            // Generar username: inicial_nombre + primer_apellido (sin CI, sin acentos)
            $baseUsername = strtolower(
                substr(trim($request->nombres), 0, 1) .
                explode(' ', trim($request->apellidos))[0]
            );
            $baseUsername = iconv('UTF-8', 'ASCII//TRANSLIT', $baseUsername) ?: $baseUsername;
            $baseUsername = preg_replace('/[^a-z0-9]/', '', $baseUsername);
            $username = $baseUsername;
            $counter  = 1;
            while (DB::table('usuarios')->where('username', $username)->exists()) {
                $username = $baseUsername . $counter;
                $counter++;
            }

            $password = PasswordHelper::generar();

            $usuarioId = DB::table('usuarios')->insertGetId([
                'rol_id'         => 2,
                'username'       => $username,
                'password'       => $password,
                'password_texto' => $password,
                'correo'         => $request->correo,
                'estado'         => true,
                'created_at'     => now(),
            ]);

            DB::table('docentes')->insert([
                'usuario_id'      => $usuarioId,
                'ci'              => $request->ci,
                'nombres'         => $request->nombres,
                'apellidos'       => $request->apellidos,
                'correo'          => $request->correo,
                'profesion'       => $request->profesion,
                'tiene_maestria'  => $request->tiene_maestria  ?? false,
                'tiene_diplomado' => $request->tiene_diplomado ?? false,
            ]);

            BitacoraService::registrar(
                $usuarioId, 'INSERT', 'docentes',
                'Registro público de docente: ' . $request->nombres . ' ' . $request->apellidos
            );

            DB::commit();

            return response()->json([
                'success'           => true,
                'cumple_requisitos' => true,
                'mensaje'           => 'Registro exitoso',
                'credenciales'      => [
                    'username'  => $username,
                    'password'  => $password,
                    'nombres'   => $request->nombres,
                    'apellidos' => $request->apellidos,
                    'correo'    => $request->correo,
                    'profesion' => $request->profesion,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'mensaje' => 'Error al registrar: ' . $e->getMessage()], 500);
        }
    }
}
