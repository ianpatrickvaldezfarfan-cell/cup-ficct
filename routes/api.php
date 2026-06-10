<?php
/**
 * Rutas de la API REST del sistema CUP-FICCT.
 *
 * Todas las rutas tienen el prefijo /api/ (configurado en bootstrap/app.php).
 * IMPORTANTE: Las rutas con segmentos fijos (ej: /search, /estadisticas) deben
 * definirse ANTES de las rutas parametrizadas (ej: /{id}) para evitar que
 * Laravel interprete "search" como un valor de parametro.
 *
 * La API es stateless: la autenticacion se maneja via estado React en el frontend.
 * El usuario autenticado se pasa en el header 'X-User-Id' para registro en bitacora.
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RegistroController;
use App\Http\Controllers\PostulanteController;
use App\Http\Controllers\ExamenController;
use App\Http\Controllers\MateriaController;
use App\Http\Controllers\PostulacionController;
use App\Http\Controllers\GrupoController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocenteController;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\BitacoraController;

// ===== BITACORA (primero para evitar conflicto con /{id}) =====
Route::get("/bitacora/estadisticas", [BitacoraController::class, "estadisticas"]);
Route::get("/bitacora/filtrar",      [BitacoraController::class, "filtrar"]);
Route::get("/bitacora",              [BitacoraController::class, "index"]);

// ===== REGISTRO PUBLICO (flujo en 3 pasos + docentes) =====
Route::get("/carreras", [RegistroController::class, "carreras"]);   // Catalogo de carreras
Route::post("/registro/paso1",   [RegistroController::class, "paso1"]);         // Datos personales + reserva cupo
Route::post("/registro/paso1b",  [RegistroController::class, "paso1b"]);        // Subida de documentos
Route::post("/registro/paso2",   [RegistroController::class, "paso2"]);         // Pago + creacion de usuario
Route::post("/registro/docente", [RegistroController::class, "registroDocente"]); // Registro publico de docentes

// ===== USUARIOS (search y cargar-csv antes de /{id}) =====
Route::get("/usuarios/search",          [UsuarioController::class, "search"]);
Route::post("/usuarios/cargar-csv",     [UsuarioController::class, "cargarCSV"]);
Route::get("/usuarios",                 [UsuarioController::class, "index"]);
Route::post("/usuarios",                [UsuarioController::class, "store"]);
Route::put("/usuarios/{id}",            [UsuarioController::class, "update"]);
Route::put("/usuarios/{id}/activar",    [UsuarioController::class, "activar"]);
Route::put("/usuarios/{id}/desactivar", [UsuarioController::class, "desactivar"]);

// ===== AUTENTICACION =====
Route::post("/login",  [AuthController::class, "login"]);
Route::post("/logout", [AuthController::class, "logout"]);
Route::post("/auth/recuperar-password", [AuthController::class, "recuperarPassword"]);

// ===== DASHBOARD =====
Route::get("/dashboard/estadisticas", [DashboardController::class, "estadisticas"]);

// ===== POSTULANTES (search y estadisticas antes de /{id}) =====
Route::get("/postulantes",              [PostulanteController::class, "index"]);
Route::post("/postulantes",             [PostulanteController::class, "store"]);
Route::get("/postulantes/search",       [PostulanteController::class, "search"]);
Route::get("/postulantes/estadisticas", [PostulanteController::class, "estadisticas"]);
Route::get("/postulantes/{id}",         [PostulanteController::class, "show"]);
Route::put("/postulantes/{id}",         [PostulanteController::class, "update"]);
Route::delete("/postulantes/{id}",      [PostulanteController::class, "destroy"]);

// ===== EXAMENES (estadisticas, recientes, postulante antes de /{id}) =====
Route::get("/examenes",                            [ExamenController::class, "index"]);
Route::post("/examenes",                           [ExamenController::class, "store"]);
Route::get("/examenes/estadisticas",               [ExamenController::class, "estadisticas"]);
Route::get("/examenes/recientes",                  [ExamenController::class, "recientes"]);
Route::get("/examenes/postulante/{postulante_id}", [ExamenController::class, "getByPostulante"]);
Route::get("/examenes/{id}",                       [ExamenController::class, "show"]);
Route::put("/examenes/{id}",                       [ExamenController::class, "update"]);

// ===== CATALOGO =====
Route::get("/materias", [MateriaController::class, "index"]);

// ===== POSTULACIONES (postulante y /{id}/estado antes de /{id}) =====
Route::get("/postulaciones",                           [PostulacionController::class, "index"]);
Route::post("/postulaciones",                          [PostulacionController::class, "store"]);
Route::get("/postulaciones/postulante/{postulante_id}",[PostulacionController::class, "getByPostulante"]);
Route::get("/postulaciones/{id}",                      [PostulacionController::class, "show"]);
Route::put("/postulaciones/{id}",                      [PostulacionController::class, "update"]);
Route::put("/postulaciones/{id}/estado",               [PostulacionController::class, "actualizarEstado"]);

// ===== GRUPOS =====
Route::get("/grupos",           [GrupoController::class, "index"]);
Route::get("/grupos/calcular",  [GrupoController::class, "calcular"]);  // Previsualizar sin crear
Route::post("/grupos/asignar",  [GrupoController::class, "asignar"]);   // Generar grupos automaticamente
Route::get("/grupos/{id}",      [GrupoController::class, "show"]);

// ===== DOCENTES (search, estadisticas, asignaciones antes de /{id}) =====
Route::get("/docentes",               [DocenteController::class, "index"]);
Route::post("/docentes",              [DocenteController::class, "store"]);
Route::get("/docentes/search",        [DocenteController::class, "search"]);
Route::get("/docentes/estadisticas",  [DocenteController::class, "estadisticas"]);
Route::get("/docentes/asignaciones",      [DocenteController::class, "asignaciones"]);
Route::get("/docentes/mis-grupos",        [DocenteController::class, "misGrupos"]);
Route::get("/docentes/mis-estadisticas",  [DocenteController::class, "misEstadisticas"]);
Route::post("/docentes/asignar-automatico", [DocenteController::class, "asignarAutomatico"]);
Route::get("/docentes/{id}",              [DocenteController::class, "show"]);
Route::put("/docentes/{id}",              [DocenteController::class, "update"]);
Route::delete("/docentes/{id}",           [DocenteController::class, "destroy"]);
Route::get("/docentes/{id}/asignaciones", [DocenteController::class, "asignacionesByDocente"]);

// ===== PORTAL POSTULANTE =====
use App\Http\Controllers\PostulantePortalController;

Route::get("/postulante/mi-resumen",     [PostulantePortalController::class, "miResumen"]);
Route::get("/postulante/mis-datos",      [PostulantePortalController::class, "misDatos"]);
Route::put("/postulante/mis-datos",      [PostulantePortalController::class, "actualizarDatos"]);
Route::get("/postulante/mi-postulacion", [PostulantePortalController::class, "miPostulacion"]);
Route::get("/postulante/mis-documentos", [PostulantePortalController::class, "misDocumentos"]);
Route::get("/postulante/mi-pago",        [PostulantePortalController::class, "miPago"]);
Route::get("/postulante/mis-notas",      [PostulantePortalController::class, "misNotas"]);
Route::get("/postulante/mi-grupo",         [PostulantePortalController::class, "miGrupo"]);
Route::put("/postulante/cambiar-password", [PostulantePortalController::class, "cambiarPassword"]);

// ===== PORTAL DOCENTE =====
Route::get("/docente/mis-datos", [DocenteController::class, "misDatos"]);
Route::put("/docente/mis-datos", [DocenteController::class, "actualizarMisDatos"]);