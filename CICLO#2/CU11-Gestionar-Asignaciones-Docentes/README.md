# CU11 - Gestionar Asignaciones de Docentes

**Actor:** Administrador  
**Rutas:** `GET /api/docentes/{id}/asignaciones`, `POST /api/docentes/asignar-automatico`  
**Controller:** `DocenteController`

## Diagrama de Secuencia

```
Actor → «UI» PanelAsignaciones → «CC» AsignacionController
     → «S» ValidadorAsignacion → «E» BDAsignacionesDocentes

1: asignarDocente(docente_id, grupo_id, materia_id)
1.2: verificarLimiteGrupos(docente_id, limite: 4)
1.3: contarGruposAsignados(docente_id)
1.4: [totalGruposAsignados]

1.5.1: [si totalGrupos >= 4] retornarError(maximo 4 grupos)

1.6: verificarDuplicado(docente_id, grupo_id, materia_id)

1.9.1: [si duplicado] retornarError(asignacion ya existe)

1.10: guardarAsignacion(docente_id, grupo_id, materia_id)
1.12: mostrarCargaHoraria(grupos: 1-4, materias, aulas, horarios)
```

## Archivos del caso de uso

- Backend: `app/Http/Controllers/DocenteController.php` → `asignarAutomatico()`, `asignaciones()`
- Frontend: `resources/js/components/Docentes.jsx` (modal de asignaciones)
- Rutas: `GET /api/docentes/asignaciones`, `POST /api/docentes/asignar-automatico`

## Metodos implementados

- `asignarAutomatico()`: distribuye docentes equitativamente entre materias y grupos, con aulas diferenciadas por materia → Mensajes 1.2-1.12
- `asignacionesByDocente()`: lista asignaciones de un docente con horario y turno → Mensaje 1.12
- `asignaciones()`: lista global con JOIN a docentes, materias, grupos, aulas, horarios

## Reglas de negocio

- Maximo 4 grupos por docente
- Restriccion UNIQUE: `docente_id + grupo_id + materia_id`
- Materias: Computacion, Matematicas, Ingles, Fisica (4 por grupo)
- Aulas diferenciadas por materia para evitar choques
