<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('horarios', function (Blueprint $table) {
            $table->id();
            $table->time('horario_ini');
            $table->time('horario_fin');
            $table->string('dias', 50);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('horarios');
    }
};
