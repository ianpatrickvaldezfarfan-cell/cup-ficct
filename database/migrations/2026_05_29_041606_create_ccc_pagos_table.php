<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulacion_id')->constrained('postulaciones');
            $table->string('concepto', 100);
            $table->decimal('monto', 10, 2);
            $table->timestamp('fecha')->useCurrent();
            $table->string('pasarela_referencia')->unique();
            $table->string('estado')->default('COMPLETADO');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos');
    }
};
