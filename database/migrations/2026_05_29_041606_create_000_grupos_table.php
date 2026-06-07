<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grupos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 50);
            $table->string('gestion', 10);
            $table->foreignId('aula_id')->constrained('aulas');
            $table->foreignId('horario_id')->constrained('horarios');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grupos');
    }
};
