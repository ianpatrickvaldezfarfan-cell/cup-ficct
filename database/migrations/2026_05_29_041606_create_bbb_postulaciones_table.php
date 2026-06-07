<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('postulaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulante_id')->constrained('postulantes');
            $table->foreignId('carrera_opcion1_id')->constrained('carreras');
            $table->foreignId('carrera_opcion2_id')->constrained('carreras');
            $table->string('gestion', 10);
            $table->string('estado_admision')->default('EN PROCESO');
            $table->foreignId('carrera_asignada_id')->nullable()->constrained('carreras');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('postulaciones');
    }
};
