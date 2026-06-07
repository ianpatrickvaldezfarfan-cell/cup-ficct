<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo del registro de auditoria del sistema.
 *
 * Cada fila representa un evento de INSERT/UPDATE/DELETE/LOGIN/LOGOUT.
 * Los registros son creados exclusivamente por BitacoraService::registrar().
 * No tiene timestamps de Eloquent (fecha_hora se gestiona manualmente).
 *
 * @property int         $id
 * @property int|null    $usuario_id      Null para eventos del sistema sin sesion
 * @property string      $accion          INSERT | UPDATE | DELETE | LOGIN | LOGOUT
 * @property string      $tabla_afectada
 * @property string      $descripcion
 * @property \Carbon\Carbon $fecha_hora
 * @property string|null $direccion_ip
 */
class Bitacora extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'bitacora';
    public $timestamps = false;
    protected $fillable = [
        'usuario_id','accion','tabla_afectada',
        'descripcion','fecha_hora','direccion_ip'
    ];
    public function usuario() {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}