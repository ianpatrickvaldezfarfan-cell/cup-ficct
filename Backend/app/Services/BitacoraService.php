<?php
namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * CU14 - ADMINISTRAR BITÁCORA
 * SERVICIO DE REGISTRO AUTOMÁTICO
 *
 * Diagrama de Secuencia - FLUJO 2:
 * Este servicio implementa el mensaje:
 * 2.1: insertarRegistro(usuario_id, accion, tabla_afectada,
 *      descripcion, fecha_hora, direccion_ip)
 *
 * Se llama automáticamente desde:
 * - AuthController@login  → accion: LOGIN
 * - AuthController@logout → accion: LOGOUT
 * - PostulanteController@store/update/destroy → accion: INSERT/UPDATE/DELETE
 * - DocenteController@store/update/destroy    → accion: INSERT/UPDATE/DELETE
 * - ExamenController@store/update             → accion: INSERT/UPDATE
 * - GrupoController@asignar                   → accion: INSERT
 * - UsuarioController@store/activar/desactivar → accion: INSERT/UPDATE
 *
 * IMPORTANTE: El try/catch garantiza que si falla el registro
 * en bitácora NO interrumpe el flujo principal del sistema.
 *
 * Servicio estatico para el registro automatico de eventos en la bitacora.
 * Se llama desde cualquier controlador sin instanciacion.
 */
class BitacoraService
{
    /**
     * Inserta un registro de auditoria en la tabla 'bitacora'.
     *
     * Captura automaticamente la IP del cliente con request()->ip().
     * Acepta usuario_id nulo para eventos del sistema o registro publico.
     * El try/catch interno garantiza que un fallo en la bitacora nunca
     * interrumpa la operacion de negocio que origino el evento.
     *
     * @param  int|null $usuario_id     ID del usuario que realizo la accion (null si es sistema)
     * @param  string   $accion         Tipo de evento: INSERT, UPDATE, DELETE, LOGIN, LOGOUT
     * @param  string   $tabla_afectada Nombre de la tabla afectada por la operacion
     * @param  string   $descripcion    Descripcion legible del evento registrado
     * @return void
     */
    public static function registrar(
        $usuario_id,
        $accion,
        $tabla_afectada,
        $descripcion
    ): void {
        try {
            DB::table('bitacora')->insert([
                'usuario_id'     => $usuario_id ?: null,
                'accion'         => $accion,
                'tabla_afectada' => $tabla_afectada,
                'descripcion'    => $descripcion,
                'fecha_hora'     => now(),
                'direccion_ip'   => request()->ip(),
            ]);
        } catch (\Exception $e) {
            // No interrumpir el flujo principal si falla la bitácora
        }
    }
}
