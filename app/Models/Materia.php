<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de materia del Curso Preuniversitario.
 *
 * Las materias fijas del curso son: Computacion, Matematicas, Ingles, Fisica.
 * Cada materia puede tener notas asociadas por postulacion y asignaciones a docentes.
 *
 * @property int    $id
 * @property string $nombre
 */
class Materia extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'materias';
    protected $fillable = ['nombre'];
    public function notas() {
        return $this->hasMany(Nota::class, 'materia_id');
    }
    public function asignaciones() {
        return $this->hasMany(AsignacionDocente::class, 'materia_id');
    }
}