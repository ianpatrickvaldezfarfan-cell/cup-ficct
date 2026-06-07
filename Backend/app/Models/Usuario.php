<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de cuentas de acceso al sistema.
 *
 * Representa un usuario autenticable con rol asignado (1=admin, 2=docente, 3=postulante).
 * El campo 'estado' permite desactivar la cuenta sin eliminarla.
 *
 * @property int         $id
 * @property int         $rol_id
 * @property string      $username
 * @property string      $password   Hash bcrypt — oculto en serializacion
 * @property string      $correo
 * @property bool        $estado     true=activo, false=desactivado
 */
class Usuario extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'usuarios';
    /** @var array Campos asignables masivamente */
    protected $fillable = ['rol_id','username','password','correo','estado'];
    /** @var array Campos ocultos en respuestas JSON */
    protected $hidden = ['password'];
    public function rol() {
        return $this->belongsTo(Rol::class, 'rol_id');
    }
    public function postulante() {
        return $this->hasOne(Postulante::class, 'usuario_id');
    }
    public function docente() {
        return $this->hasOne(Docente::class, 'usuario_id');
    }
    public function administrativo() {
        return $this->hasOne(Administrativo::class, 'usuario_id');
    }
    public function bitacoras() {
        return $this->hasMany(Bitacora::class, 'usuario_id');
    }
}