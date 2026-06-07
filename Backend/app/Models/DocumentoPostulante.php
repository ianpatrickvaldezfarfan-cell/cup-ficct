<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de documento requerido para la postulacion.
 *
 * Los 4 documentos obligatorios son: Certificado de Nacimiento, CI Anverso/Reverso,
 * Fotografia Fondo Rojo, Titulo de Bachiller. Se suben en el paso1b del registro.
 * El campo 'url' apunta a la ruta publica en storage/app/public/documentos/{postulacion_id}/.
 *
 * @property int    $id
 * @property int    $postulacion_id
 * @property string $tipo   Nombre del tipo de documento requerido
 * @property string $url    Ruta publica del archivo almacenado (storage/...)
 */
class DocumentoPostulante extends Model
{
    /** @var string Tabla de la BD */
    protected $table = 'documentos_postulantes';

    /** @var array Campos asignables masivamente */
    protected $fillable = ['postulacion_id', 'tipo', 'url'];
}
