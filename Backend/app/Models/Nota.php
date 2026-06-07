<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de calificaciones por materia de un postulante.
 *
 * Almacena las 3 notas parciales. Las columnas nota_final y estado_materia
 * son columnas GENERATED en PostgreSQL (calculadas automaticamente por la BD).
 * nota_final = (nota1 + nota2 + nota3) / 3
 * estado_materia: APROBADO si nota_final >= 60, REPROBADO si < 60
 *
 * @property int        $id
 * @property int        $postulacion_id
 * @property int        $materia_id
 * @property float      $nota1
 * @property float      $nota2
 * @property float      $nota3
 * @property float      $nota_final     Columna GENERATED - no modificar desde Laravel
 * @property string     $estado_materia Columna GENERATED - no modificar desde Laravel
 */
class Nota extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'notas';
    protected $fillable = ['postulacion_id','materia_id','nota1','nota2','nota3'];
    // nota_final y estado_materia son columnas GENERATED en PostgreSQL, no se llenan desde Laravel
    public function postulacion() {
        return $this->belongsTo(Postulacion::class, 'postulacion_id');
    }
    public function materia() {
        return $this->belongsTo(Materia::class, 'materia_id');
    }
}