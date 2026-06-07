BACKEND - CUP-FICCT
Framework: Laravel 12 (PHP 8.2)
Base de datos: PostgreSQL
Arquitectura: MVC (Modelo-Vista-Controlador)

Controllers:
- AuthController: login, logout, recuperarPassword
- RegistroController: paso1, paso1b, paso2
- PostulanteController: CRUD + exportar
- PostulacionController: cupos + lockForUpdate
- ExamenController: notas + calculos
- GrupoController: CEIL + round-robin
- DocenteController: CRUD + asignaciones
- UsuarioController: CRUD + cargarCSV
- DashboardController: estadisticas
- BitacoraController: historial + filtros
- MateriaController: catalogo

Services:
- BitacoraService: registro automatico auditoria

Rutas API: routes/api.php
Base de datos: 18 tablas en PostgreSQL
