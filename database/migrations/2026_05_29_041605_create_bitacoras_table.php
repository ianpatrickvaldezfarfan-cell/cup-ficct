<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::dropIfExists('bitacora');
        Schema::create('bitacora', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('usuario_id')->nullable();
            $table->string('accion', 50);
            $table->string('tabla_afectada', 100)->nullable();
            $table->text('descripcion')->nullable();
            $table->timestamp('fecha_hora')->useCurrent();
            $table->string('direccion_ip', 45)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bitacora');
    }
};
