<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de grupo de estudio del Curso Preuniversitario.
 *
 * Los grupos se generan automaticamente por GrupoController::asignar().
 * Cada grupo tiene capacidad maxima de 70 estudiantes (CEIL(inscritos/70)).
 * Los postulantes se vinculan via la tabla pivote 'grupo_postulantes'.
 *
 * @property int    $id
 * @property string $nombre     Ej: "Grupo 1", "Grupo 2"
 * @property string $gestion    Anio de la gestion (ej: "2026")
 * @property int    $aula_id
 * @property int    $horario_id
 */
class Grupo extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'grupos';
    protected $fillable = ['nombre','gestion','aula_id','horario_id'];
    public function aula() {
        return $this->belongsTo(Aula::class, 'aula_id');
    }
    public function horario() {
        return $this->belongsTo(Horario::class, 'horario_id');
    }
    public function postulaciones() {
        return $this->belongsToMany(Postulacion::class, 'grupo_postulantes', 'grupo_id', 'postulacion_id');
    }
    public function asignaciones() {
        return $this->hasMany(AsignacionDocente::class, 'grupo_id');
    }
}