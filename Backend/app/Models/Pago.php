<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de pago de inscripcion al Curso Preuniversitario.
 *
 * Registra el comprobante de pago generado en el paso2 del registro publico.
 * El estado siempre es 'COMPLETADO' ya que es una simulacion (no hay rechazo real).
 * La referencia tiene formato: REF-XXXXXX-YYYY (ID de postulacion con padding + anio).
 *
 * @property int         $id
 * @property int         $postulacion_id
 * @property string      $concepto
 * @property float       $monto              Monto fijo de Bs 700
 * @property \Carbon\Carbon $fecha
 * @property string      $pasarela_referencia
 * @property string      $estado             COMPLETADO
 */
class Pago extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'pagos';
    protected $fillable = [
        'postulacion_id','concepto','monto',
        'fecha','pasarela_referencia','estado'
    ];
    public function postulacion() {
        return $this->belongsTo(Postulacion::class, 'postulacion_id');
    }
}