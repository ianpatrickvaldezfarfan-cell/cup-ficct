<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('docentes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('profesion', 100);
            $table->boolean('tiene_maestria')->default(false);
            $table->boolean('tiene_diplomado')->default(false);
            $table->string('nombres', 100);
            $table->string('apellidos', 100);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('docentes');
    }
};
