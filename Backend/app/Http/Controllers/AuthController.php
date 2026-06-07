<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Services\BitacoraService;

/**
 * CU1 - INICIAR SESIÓN
 * Diagrama de Secuencia:
 * Actor → «UI» Login → «CC» AuthController → «E» Usuarios
 *
 * Mensajes del diagrama:
 * 1: ingresarCredenciales(username, password) - Actor → Login
 * 1.1: solicitarAutenticacion(username, password) - Login → AuthController
 * 1.2: validarCredenciales(username, Hash::check(password)) - AuthController → Usuarios
 * 1.3: [resultadoValidacion] - Usuarios → AuthController
 * 1.4: mostrarResultadoAutenticacion() - AuthController → Login
 * 1.5: [si éxito] mostrarDashboard(username, rol) - Login → Actor
 * 1.6: [si error] mostrarError() - Login → Actor
 *
 * CU2 - CERRAR SESIÓN
 * 1: solicitarCierreSesion() - Actor → Dashboard
 * 1.1: destruirSesionActiva() - Dashboard → AuthController
 * 1.2: eliminarTokenSesion() - AuthController → Usuarios
 * 1.3: [sesionEliminada] - Usuarios → AuthController
 * 1.4: confirmarCierre() - AuthController → Dashboard
 * 1.5: redireccionarPaginaLogin() - Dashboard → Actor
 *
 * Controlador de autenticacion del sistema CUP-FICCT.
 * Gestiona el inicio de sesion, cierre de sesion y recuperacion de contrasena.
 * Todas las operaciones quedan registradas en la bitacora del sistema.
 */
class AuthController extends Controller
{
    /**
     * Autentica un usuario con username y password.
     *
     * Busca un usuario activo (estado=true) por username y verifica la contrasena
     * usando Hash::check(). Si las credenciales son correctas, registra el evento
     * LOGIN en la bitacora y retorna los datos del usuario con su rol.
     *
     * @param  Request $request  Debe contener: username (string), password (string)
     * @return \Illuminate\Http\JsonResponse  { id, username, correo, rol } o error 401
     */
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        // DIAGRAMA SECUENCIA CU1 - Mensaje 1.2
        // validarCredenciales(username, Hash::check(password))
        // Busca usuario en BD y verifica credenciales

        $usuario = DB::table('usuarios')
            ->where('username', $request->username)
            ->where('estado', true)
            ->first();

        if (!$usuario || !Hash::check($request->password, $usuario->password)) {
            return response()->json(['message' => 'Credenciales incorrectas'], 401);
        }

        $rol = DB::table('roles')->where('id', $usuario->rol_id)->first();

        BitacoraService::registrar(
            $usuario->id,
            'LOGIN',
            'usuarios',
            'Inicio de sesión: ' . $request->username
        );

        return response()->json([
            'id'       => $usuario->id,
            'username' => $usuario->username,
            'correo'   => $usuario->correo,
            'rol'      => $rol->nombre,
        ]);
    }

    /**
     * Cierra la sesion del usuario autenticado.
     *
     * Lee el usuario_id desde el header HTTP 'X-User-Id' enviado por el frontend
     * y registra el evento LOGOUT en la bitacora. La sesion se destruye en el
     * cliente (estado React); el backend es stateless en esta implementacion.
     *
     * @param  Request $request  Header 'X-User-Id' con el ID del usuario que cierra sesion
     * @return \Illuminate\Http\JsonResponse  { message: 'Sesion cerrada' }
     */
    public function logout(Request $request)
    {
        $userId = $request->header('X-User-Id');
        if ($userId) {
            BitacoraService::registrar(
                $userId,
                'LOGOUT',
                'usuarios',
                'Cierre de sesión usuario ID: ' . $userId
            );
        }
        return response()->json(['message' => 'Sesión cerrada']);
    }

    /**
     * Genera y envia una contrasena temporal al correo del usuario.
     *
     * Busca al usuario por correo electronico, genera una contrasena aleatoria
     * de 8 caracteres con el formato: 2 mayusculas + 4 digitos + 2 minusculas
     * (ej: AB1234cd), actualiza el hash en BD y envia el correo con Laravel Mail.
     * Si el envio falla, la contrasena igual queda actualizada en BD.
     *
     * @param  Request $request  Debe contener: correo (email valido)
     * @return \Illuminate\Http\JsonResponse  Mensaje de exito o error
     */
    public function recuperarPassword(Request $request)
    {
        $request->validate(['correo' => 'required|email']);

        $usuario = DB::table('usuarios')
            ->where('correo', $request->correo)
            ->first();

        if (!$usuario) {
            return response()->json(
                ['message' => 'No existe una cuenta registrada con ese correo.'],
                404
            );
        }

        // Genera contraseña: 2 mayúsculas + 4 dígitos + 2 minúsculas  → ej: AB1234cd
        $mayusculas = substr(str_shuffle('ABCDEFGHJKLMNPQRSTUVWXYZ'), 0, 2);
        $digitos    = substr(str_shuffle('0123456789'), 0, 4);
        $minusculas = substr(str_shuffle('abcdefghjkmnpqrstuvwxyz'), 0, 2);
        $nuevaPassword = $mayusculas . $digitos . $minusculas;

        DB::table('usuarios')
            ->where('id', $usuario->id)
            ->update(['password' => Hash::make($nuevaPassword)]);

        try {
            Mail::raw(
                "Hola {$usuario->username},\n\nSu nueva contraseña temporal es: {$nuevaPassword}\n\nPor seguridad, cámbiela después de iniciar sesión.\n\n— CUP FICCT",
                function ($message) use ($usuario) {
                    $message->to($usuario->correo)
                            ->subject('Recuperación de contraseña — CUP FICCT');
                }
            );
        } catch (\Exception $e) {
            // La contraseña ya fue actualizada; el fallo de correo es no crítico
            return response()->json([
                'message' => 'Contraseña actualizada, pero no se pudo enviar el correo. Contacte al administrador.',
            ], 200);
        }

        return response()->json([
            'message' => 'Se ha enviado una nueva contraseña temporal a su correo electrónico.',
        ]);
    }
}