<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de carrera universitaria ofertada por la FICCT.
 *
 * El campo cupos_disponibles se decrementa atomicamente con lockForUpdate()
 * en PostulacionController y RegistroController al asignar un postulante.
 *
 * @property int    $id
 * @property int    $facultad_id
 * @property string $nombre
 * @property int    $cupos_disponibles
 */
class Carrera extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'carreras';
    protected $fillable = ['facultad_id','nombre','cupos_disponibles'];
    public function facultad() {
        return $this->belongsTo(Facultad::class, 'facultad_id');
    }
    public function postulacionesOpcion1() {
        return $this->hasMany(Postulacion::class, 'carrera_opcion1_id');
    }
    public function postulacionesOpcion2() {
        return $this->hasMany(Postulacion::class, 'carrera_opcion2_id');
    }
}