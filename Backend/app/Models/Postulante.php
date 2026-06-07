<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de postulante al Curso Preuniversitario.
 *
 * Almacena los datos personales del postulante. El campo usuario_id
 * se asigna en el paso2 del registro publico o al crear desde el panel admin.
 *
 * @property int         $id
 * @property int|null    $usuario_id   Vinculado tras confirmar pago
 * @property string      $ci
 * @property string      $nombres
 * @property string      $apellidos
 * @property string      $fecha_nac
 * @property string      $genero       M | F | O
 * @property string|null $correo
 * @property string|null $ciudad
 * @property string|null $colegio_procedencia
 */
class Postulante extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'postulantes';
    protected $fillable = [
        'usuario_id','ci','nombres','apellidos','fecha_nac',
        'genero','direccion','telefono','colegio_procedencia','ciudad'
    ];
    public function usuario() {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
    public function postulaciones() {
        return $this->hasMany(Postulacion::class, 'postulante_id');
    }
}