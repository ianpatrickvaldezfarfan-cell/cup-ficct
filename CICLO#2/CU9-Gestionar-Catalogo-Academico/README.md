# CU9 - Gestionar Catalogo Academico

**Actor:** Administrador  
**Rutas:** `GET /api/materias`, `GET /api/carreras`  
**Controller:** `MateriaController`

## Diagrama de Secuencia

```
Actor → «UI» PanelRegistro → «CC» MateriaController → «E» BDCatalogo

1: solicitarCatalogo() - Actor → UI
1.1: obtenerCarreras() - UI → Controller
1.2: SELECT carreras WHERE cupos_disponibles > 0
1.3: [listaCarreras: Sistemas, Informatica, Redes, Robotica]
1.4: mostrarSelectCarreras(carrera_opcion1, carrera_opcion2) - Controller → UI → Actor

2: solicitarMaterias() - Actor → UI
2.1: obtenerMaterias() - UI → Controller
2.2: SELECT materias ORDER BY nombre
2.3: [listaMaterias: Computacion, Matematicas, Ingles, Fisica]
2.4: mostrarMaterias() - Controller → UI → Actor
```

## Archivos del caso de uso

- Backend: `app/Http/Controllers/MateriaController.php`
- Frontend: `resources/js/components/Registro.jsx` (selects de carreras)
- Frontend: `resources/js/components/Examenes.jsx` (lista de materias)
- Rutas: `GET /api/materias`, `GET /api/carreras`

## Entidades del catalogo

| Entidad | Datos |
|---|---|
| Carreras | Sistemas (150 cupos), Informatica (150), Redes (100), Robotica (100) |
| Materias | Computacion, Matematicas, Ingles, Fisica |
| Aulas | Capacidad 70 estudiantes c/u |
| Horarios | Manana (07:00-13:00), Tarde (14:00-18:00), Noche (18:00-20:00) |

## Metodos implementados

- `MateriaController@index()`: SELECT * FROM materias
- `RegistroController@carreras()`: SELECT id, nombre, cupos_disponibles FROM carreras
