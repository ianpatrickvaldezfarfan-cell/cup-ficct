<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Desactivar restricciones de FK temporalmente
        DB::statement('SET session_replication_role = replica;');

        // Leer y ejecutar el SQL de exportación
        $sql = file_get_contents(database_path('seeders/data_export.sql'));

        // Filtrar solo las líneas de INSERT (excluir tablas de Laravel)
        $laravelTables = ['cache', 'cache_locks', 'failed_jobs', 'job_batches',
                         'jobs', 'migrations', 'password_reset_tokens',
                         'sessions', 'users'];

        $lines = explode("\n", $sql);
        $filteredLines = [];
        $skip = false;

        foreach ($lines as $line) {
            // Detectar sección de tabla Laravel
            if (preg_match('/-- Data for Name: (\w+)/', $line, $matches)) {
                $skip = in_array($matches[1], $laravelTables);
            }
            if (!$skip) {
                $filteredLines[] = $line;
            }
        }

        $filteredSql = implode("\n", $filteredLines);

        // Ejecutar solo los INSERT statements uno por uno
        $statements = array_filter(
            explode(";\n", $filteredSql),
            fn($s) => str_starts_with(trim($s), 'INSERT')
        );

        foreach ($statements as $statement) {
            $statement = trim($statement);
            if (!empty($statement)) {
                DB::statement($statement . ';');
            }
        }

        // Resetear secuencias de PostgreSQL
        $tables = ['roles', 'usuarios', 'administrativos', 'aulas', 'docentes',
                  'horarios', 'grupos', 'materias', 'asignaciones_docentes',
                  'facultades', 'carreras', 'postulantes', 'postulaciones',
                  'documentos_postulantes', 'notas', 'pagos', 'bitacora'];

        foreach ($tables as $table) {
            DB::statement("SELECT setval(pg_get_serial_sequence('$table', 'id'),
                          COALESCE((SELECT MAX(id) FROM $table), 1));");
        }

        // Reactivar restricciones FK
        DB::statement('SET session_replication_role = DEFAULT;');
    }
}
