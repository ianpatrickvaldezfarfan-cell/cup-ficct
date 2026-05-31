<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de postulacion a una carrera universitaria.
 *
 * Registra la inscripcion de un postulante a la carrera asignada (opcion1 o 2).
 * El estado_admision evoluciona: PENDIENTE_PAGO → EN PROCESO → APROBADO | REPROBADO.
 *
 * @property int    $id
 * @property int    $postulante_id
 * @property int    $carrera_opcion1_id
 * @property int    $carrera_opcion2_id
 * @property int    $carrera_asignada_id  Carrera efectivamente asignada segun cupos
 * @property string $gestion              Anio de inscripcion (ej: "2026")
 * @property string $estado_admision      PENDIENTE_PAGO | EN PROCESO | APROBADO | REPROBADO
 */
class Postulacion extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'postulaciones';
    protected $fillable = [
        'postulante_id','carrera_opcion1_id','carrera_opcion2_id',
        'gestion','estado_admision'
    ];
    public function postulante() {
        return $this->belongsTo(Postulante::class, 'postulante_id');
    }
    public function carreraOpcion1() {
        return $this->belongsTo(Carrera::class, 'carrera_opcion1_id');
    }
    public function carreraOpcion2() {
        return $this->belongsTo(Carrera::class, 'carrera_opcion2_id');
    }
    public function notas() {
        return $this->hasMany(Nota::class, 'postulacion_id');
    }
    public function pagos() {
        return $this->hasMany(Pago::class, 'postulacion_id');
    }
    public function documentos() {
        return $this->hasMany(DocumentoPostulante::class, 'postulacion_id');
    }
    public function grupos() {
        return $this->belongsToMany(Grupo::class, 'grupo_postulantes', 'postulacion_id', 'grupo_id');
    }
}