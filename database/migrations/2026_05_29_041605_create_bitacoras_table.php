<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('bitacora');
        Schema::create('bitacora', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->string('accion', 50);
            $table->string('tabla_afectada', 50)->nullable();
            $table->text('descripcion');
            $table->timestamp('fecha_hora')->useCurrent();
            $table->string('direccion_ip', 45)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bitacora');
    }
};
