<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de horario de clases disponible.
 *
 * Los horarios se asignan por bloques de turno al generar grupos:
 * indices 0-3 = manana, 4-7 = tarde, 8-11 = noche (segun hora de inicio).
 *
 * @property int    $id
 * @property string $horario_ini  Hora de inicio (TIME en PostgreSQL, ej: "07:00:00")
 * @property string $horario_fin  Hora de fin
 * @property string $dias         Ej: "Lunes, Miercoles, Viernes"
 */
class Horario extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'horarios';
    protected $fillable = ['horario_ini','horario_fin','dias'];
    public function grupos() {
        return $this->hasMany(Grupo::class, 'horario_id');
    }
}