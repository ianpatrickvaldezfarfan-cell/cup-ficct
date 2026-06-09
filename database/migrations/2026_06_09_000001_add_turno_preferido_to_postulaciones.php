<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            ALTER TABLE postulaciones
            ADD COLUMN IF NOT EXISTS turno_preferido VARCHAR(20) DEFAULT 'manana'
            CHECK (turno_preferido IN ('manana', 'tarde', 'noche'))
        ");
    }

    public function down(): void
    {
        Schema::table('postulaciones', function (Blueprint $table) {
            $table->dropColumn('turno_preferido');
        });
    }
};
