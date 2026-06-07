<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facultades', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150)->unique();
            $table->string('sigla', 20)->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facultades');
    }
};
