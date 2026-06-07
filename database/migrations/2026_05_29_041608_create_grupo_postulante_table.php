<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grupo_postulantes', function (Blueprint $table) {
            $table->foreignId('grupo_id')->constrained('grupos');
            $table->foreignId('postulacion_id')->constrained('postulaciones');
            $table->primary(['grupo_id', 'postulacion_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grupo_postulantes');
    }
};
