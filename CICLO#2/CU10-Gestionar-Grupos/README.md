# CU10 - Gestionar Grupos

**Actor:** Administrador  
**Rutas:** `GET /api/grupos`, `POST /api/grupos/asignar`  
**Controller:** `GrupoController`

## Diagrama de Secuencia

```
Actor → «UI» ModuloGrupos → «CC» GrupoController
     → «S» AlgoritmoDistribucion → «E» BDGrupos

1: solicitarGeneracionGrupos(gestion: 2026)
1.1: procesarGeneracion(gestion)
1.2: contarTotalInscritos(gestion: 2026)
1.3: [totalInscritos: 1001]
1.4: calcularCantidadGrupos(CEIL(1001/70) = 15)
1.5: [cantidadGrupos: 15]
1.6: distribuirPostulantes(postulantes, grupos: 15,
     maxPorGrupo: 70, metodo: round-robin)
1.7: [gruposConPostulantes: ~67 estudiantes c/u]
1.8: asignarAulaYHorario(grupo_id, aula_id, horario_id,
     turno: manana/tarde/noche)
1.9: [asignacionConfirmada]
1.10: guardarGrupos() + guardarGrupoPostulantes()
1.11: [gruposGuardados]
1.12: mostrarResumen(totalInscritos: 1001,
      gruposHabilitados: 15, estudiantesPorGrupo: ~67)
```

## Archivos del caso de uso

- Backend: `app/Http/Controllers/GrupoController.php` → `asignar()`
- Frontend: `resources/js/components/Grupos.jsx`
- Rutas: `GET /api/grupos`, `POST /api/grupos/asignar`

## Metodos implementados

- `index()`: lista grupos con aula, horario, turno (CASE WHEN SQL) y total estudiantes
- `calcular()`: previsualiza grupos_necesarios sin crear → Mensajes 1.2-1.5
- `asignar()`: genera grupos en transaccion, distribucion round-robin → Mensajes 1.2-1.12

## Algoritmo de distribucion

```
cantidadGrupos = CEIL(totalInscritos / 70)
porTurno = CEIL(cantidadGrupos / 3)

Para cada grupo i:
  turnoIndex = FLOOR(i / porTurno)  // 0=manana, 1=tarde, 2=noche
  posEnTurno = i % porTurno
  horarioIndex = (turnoIndex * 4) + (posEnTurno % 4)

Para cada postulacion[i]:
  asignar a grupo[i % cantidadGrupos]  // round-robin
```
