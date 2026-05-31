<?php
namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Servicio estatico para el registro automatico de eventos en la bitacora.
 *
 * Se llama desde cualquier controlador sin instanciacion. El metodo registrar()
 * nunca lanza excepciones hacia afuera; cualquier fallo de BD es silenciado
 * para no interrumpir el flujo principal de la aplicacion.
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
