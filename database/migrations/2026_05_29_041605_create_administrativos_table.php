<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('administrativos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('ci', 20)->unique();
            $table->string('nombres');
            $table->string('apellidos');
            $table->string('cargo', 100);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('administrativos');
    }
};
