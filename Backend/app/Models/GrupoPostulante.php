<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Modelo pivote entre grupos y postulaciones.
 *
 * Registra la asignacion de un postulante (via su postulacion) a un grupo.
 * Se usa la tabla 'grupo_postulantes'. La distribucion es round-robin desde GrupoController.
 *
 * @property int $id
 * @property int $grupo_id
 * @property int $postulacion_id
 */
class GrupoPostulante extends Model
{
    /** @var string Tabla de la BD */
    protected $table = 'grupo_postulantes';

    /** @var array Campos asignables masivamente */
    protected $fillable = ['grupo_id', 'postulacion_id'];
}
