<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('postulantes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('ci', 20)->unique();
            $table->string('nombres');
            $table->string('apellidos');
            $table->date('fecha_nac');
            $table->enum('genero', ['M', 'F', 'O']);
            $table->string('direccion');
            $table->string('telefono');
            $table->string('colegio_procedencia');
            $table->string('ciudad');
            $table->string('correo')->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('postulantes');
    }
};
