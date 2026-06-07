<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de roles del sistema.
 *
 * Los roles predefinidos son: 1=administrador, 2=docente, 3=postulante.
 *
 * @property int    $id
 * @property string $nombre
 */
class Rol extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'roles';
    protected $fillable = ['nombre'];
    public function usuarios() {
        return $this->hasMany(Usuario::class, 'rol_id');
    }
}