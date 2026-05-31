<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de personal administrativo del sistema.
 *
 * Extiende la cuenta de usuario con datos adicionales del personal administrativo.
 * Vinculado a la tabla usuarios mediante usuario_id.
 *
 * @property int    $id
 * @property int    $usuario_id
 * @property string $ci
 * @property string $nombres
 * @property string $apellidos
 * @property string $cargo
 */
class Administrativo extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'administrativos';
    protected $fillable = ['usuario_id','ci','nombres','apellidos','cargo'];
    public function usuario() {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}