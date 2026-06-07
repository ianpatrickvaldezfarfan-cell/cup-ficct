<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rol_id')->constrained('roles');
            $table->string('username', 50)->unique();
            $table->string('password', 255);
            $table->string('correo', 100)->unique();
            $table->boolean('estado')->default(true);
            $table->string('password_texto', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};
