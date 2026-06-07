# CU12 - Gestionar Notas

**Actores:** Administrador (registra), Docente (registra), Postulante (consulta)  
**Rutas:** `GET|POST|PUT /api/examenes`  
**Controller:** `ExamenController`

## Diagrama de Secuencia - FLUJO 1 (Administrador/Docente registra)

```
Actor → «UI» ModuloExamenes → «CC» ExamenController
     → «S» CalculadorNotas → «E» Notas/Postulaciones

1: buscarPostulante(ci) - Actor → UI
1.1: obtenerPostulantePorCI(ci) - UI → Controller
1.2: consultarPostulante(ci) - Controller → BD
1.3: [datosPostulante, postulacion_id]
1.4: mostrarMaterias(Computacion, Matematicas, Ingles, Fisica)
1.5: registrarNotas(postulacion_id, materia_id, nota1, nota2, nota3)
1.6: procesarNotas(postulacion_id, materia_id, nota1, nota2, nota3)
1.7: calcularPromedio((nota1+nota2+nota3)/3) - Controller → CalculadorNotas
1.8: [promedio_materia]
1.9: verificarAprobacion(todas_materias >= 60 AND promedio_global >= 60)
1.10: [APROBADO / REPROBADO]
1.11: guardarNotas() + actualizarPostulacion(estado_admision)
1.12: [notasGuardadas]
1.13: mostrarResultado(promedio, estado_materia, promedio_global, estado_admision)
```

## Diagrama de Secuencia - FLUJO 2 (Postulante consulta)

```
Postulante → «UI» PanelPostulante → «CC» ExamenController → «E» Notas

2: consultarNotas(ci) - Postulante → UI
2.1: obtenerNotasPorCI(ci)
2.2: obtenerNotas(postulacion_id)
2.3: [notas: Computacion, Matematicas, Ingles, Fisica]
2.4: mostrarCalificaciones(materia, nota1, nota2, nota3,
     promedio, estado_materia, promedio_global, estado_admision)
```

## Archivos del caso de uso

- Backend: `app/Http/Controllers/ExamenController.php`
- Frontend: `resources/js/components/Examenes.jsx` (Flujo 1)
- Frontend: `resources/js/components/PanelPostulante.jsx` (Flujo 2)
- Rutas: `GET|POST|PUT /api/examenes`, `GET /api/examenes/postulante/{ci}`

## Metodos implementados

- `store()`: INSERT notas + actualizarEstadoAdmision() → Mensajes 1.7, 1.9, 1.11
- `update()`: UPDATE notas + actualizarEstadoAdmision() → Mensajes 1.7, 1.9, 1.11
- `getByPostulante()`: buscar por CI → notas de las 4 materias → Mensajes 2.1-2.4
- `actualizarEstadoAdmision()`: logica APROBADO/REPROBADO (privado)

## Formula de evaluacion

```
nota_final = (nota1 + nota2 + nota3) / 3     <- GENERATED en PostgreSQL
promedio_global = SUM(nota_final) / 4         <- calculado en PHP

APROBADO: TODAS las materias >= 60 AND promedio_global >= 60
REPROBADO: CUALQUIER materia < 60
EN PROCESO: notas incompletas (< 4 materias registradas)
```
