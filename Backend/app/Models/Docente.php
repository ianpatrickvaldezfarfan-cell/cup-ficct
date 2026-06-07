<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de docente del Curso Preuniversitario.
 *
 * Siempre tiene un usuario asociado (rol_id=2) creado al registrar el docente.
 * El CI del docente se almacena como username en la tabla usuarios.
 *
 * @property int    $id
 * @property int    $usuario_id
 * @property string $nombres
 * @property string $apellidos
 * @property string $profesion
 * @property bool   $tiene_maestria
 * @property bool   $tiene_diplomado
 */
class Docente extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'docentes';
    protected $fillable = ['usuario_id','profesion','tiene_maestria','tiene_diplomado'];
    public function usuario() {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
    public function asignaciones() {
        return $this->hasMany(AsignacionDocente::class, 'docente_id');
    }
}