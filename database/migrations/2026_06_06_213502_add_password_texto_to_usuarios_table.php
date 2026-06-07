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
        if (!Schema::hasColumn('usuarios', 'password_texto')) {
            Schema::table('usuarios', function (Blueprint $table) {
                $table->string('password_texto', 255)->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('usuarios', 'password_texto')) {
            Schema::table('usuarios', function (Blueprint $table) {
                $table->dropColumn('password_texto');
            });
        }
    }
};
