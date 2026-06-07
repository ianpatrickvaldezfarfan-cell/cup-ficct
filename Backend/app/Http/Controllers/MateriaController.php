<?php
namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class MateriaController extends Controller
{
    public function index()
    {
        $materias = DB::table('materias')->orderBy('nombre')->get();
        return response()->json($materias);
    }
}
