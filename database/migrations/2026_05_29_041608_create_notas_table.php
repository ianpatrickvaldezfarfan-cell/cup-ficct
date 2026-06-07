<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulacion_id')->constrained('postulaciones');
            $table->foreignId('materia_id')->constrained('materias');
            $table->decimal('nota1', 5, 2)->default(0);
            $table->decimal('nota2', 5, 2)->default(0);
            $table->decimal('nota3', 5, 2)->default(0);
            $table->decimal('nota_final', 5, 2)->storedAs('(nota1 + nota2 + nota3) / 3');
            $table->string('estado_materia')->storedAs("CASE WHEN (nota1 + nota2 + nota3) / 3 >= 60 THEN 'APROBADO' ELSE 'REPROBADO' END");
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notas');
    }
};
