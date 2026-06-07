<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Roles
        DB::table('roles')->insert([
            ['nombre' => 'Administrador'],
            ['nombre' => 'Docente'],
            ['nombre' => 'Postulante'],
        ]);

        // Facultad
        DB::table('facultades')->insert([
            ['nombre' => 'Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones', 'sigla' => 'FICCT'],
        ]);

        // Carreras
        $facultad_id = DB::table('facultades')->first()->id;
        DB::table('carreras')->insert([
            ['facultad_id' => $facultad_id, 'nombre' => 'Ingeniería en Sistemas', 'cupos_disponibles' => 300],
            ['facultad_id' => $facultad_id, 'nombre' => 'Ingeniería en Telecomunicaciones', 'cupos_disponibles' => 200],
            ['facultad_id' => $facultad_id, 'nombre' => 'Ingeniería Electrónica', 'cupos_disponibles' => 150],
            ['facultad_id' => $facultad_id, 'nombre' => 'Licenciatura en Informática', 'cupos_disponibles' => 250],
        ]);

        // Usuario admin
        $rol_admin = DB::table('roles')->where('nombre', 'Administrador')->first()->id;
        DB::table('usuarios')->insert([
            'rol_id'          => $rol_admin,
            'username'        => 'admin',
            'password'        => 'admin123',
            'password_texto'  => 'admin123',
            'correo'          => 'admin@ficct.uagrm.edu.bo',
            'estado'          => true,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // Materias
        DB::table('materias')->insert([
            ['nombre' => 'Matemáticas'],
            ['nombre' => 'Física'],
            ['nombre' => 'Química'],
            ['nombre' => 'Lenguaje'],
        ]);
    }
}
