<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de aula disponible para los grupos del Curso Preuniversitario.
 *
 * Las aulas se asignan en round-robin al generar grupos automaticamente.
 *
 * @property int    $id
 * @property string $nombre
 * @property int    $capacidad
 */
class Aula extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'aulas';
    protected $fillable = ['nombre','capacidad'];
    public function grupos() {
        return $this->hasMany(Grupo::class, 'aula_id');
    }
}