<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de facultad universitaria.
 *
 * Agrupa las carreras ofertadas. La facultad principal del sistema es la FICCT.
 *
 * @property int    $id
 * @property string $nombre
 * @property string $sigla   Ej: "FICCT"
 */
class Facultad extends Model {
    /** @var string Tabla de la BD */
    protected $table = 'facultades';
    protected $fillable = ['nombre','sigla'];
    public function carreras() {
        return $this->hasMany(Carrera::class, 'facultad_id');
    }
}