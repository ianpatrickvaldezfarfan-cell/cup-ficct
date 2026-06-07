<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de asignacion docente-materia-grupo.
 *
 * Tabla pivote que relaciona un docente con la materia que imparte
 * en un grupo especifico. Se elimina en cascada al eliminar un docente o grupo.
 *
 * @property int $id
 * @property int $grupo_id
 * @property int $docente_id
 * @property int $materia_id
 */
class AsignacionDocente extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'asignaciones_docentes';
    protected $fillable = ['grupo_id','docente_id','materia_id'];
    public function grupo() {
        return $this->belongsTo(Grupo::class, 'grupo_id');
    }
    public function docente() {
        return $this->belongsTo(Docente::class, 'docente_id');
    }
    public function materia() {
        return $this->belongsTo(Materia::class, 'materia_id');
    }
}