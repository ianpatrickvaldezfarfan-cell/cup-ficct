<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE docentes ADD COLUMN IF NOT EXISTS ci VARCHAR(20)");
        DB::statement("ALTER TABLE docentes ADD COLUMN IF NOT EXISTS correo VARCHAR(191)");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE docentes DROP COLUMN IF EXISTS ci");
        DB::statement("ALTER TABLE docentes DROP COLUMN IF EXISTS correo");
    }
};
