# CU13 - Generar Reportes y Dashboard

**Actor:** Administrador  
**Rutas:** `GET /api/dashboard/estadisticas`, `GET /api/bitacora`  
**Controllers:** `DashboardController`, `BitacoraController`

## Diagrama de Secuencia - FLUJO 1 (Dashboard tiempo real)

```
Actor → «UI» PanelDashboard → «CC» DashboardController → «E» BDSistema

1: solicitarDashboard()
1.1: cargarIndicadores(gestion: 2026)
1.2: consultarEstadisticas(totalInscritos, totalAprobados,
     totalReprobados, totalGrupos, gestion)
1.3: [indicadores: inscritos=1001, aprobados=X, reprobados=X, grupos=15]
1.4: mostrarDashboard(totalInscritos, totalAprobados,
     totalReprobados, totalGruposHabilitados)
```

## Diagrama de Secuencia - FLUJO 2 (Generacion reportes)

```
Actor → «UI» ModuloReportes → «CC» Controllers → «E» BDDatos

2: solicitarReporte(tipo: Postulantes/Docentes/Examenes/Grupos,
   formato: pantalla/CSV/PDF)
2.1: procesarSolicitudReporte(tipo, filtros)
2.2: consultarDatosReporte(gestion: 2026)
2.3: [datosReporte]
2.4: generarReporte(datos, tipo, formato)

ALT [si formato CSV]:
    2.5.1: generarCSV(datos, BOM: UTF-8)
    2.6: descargarArchivo(CSV)

ALT [si formato PDF]:
    2.5.2: generarPDF(datos, jsPDF + autotable)
    2.6: descargarArchivo(PDF)

ALT [formato pantalla]:
    2.6: mostrarReporte(datos en tabla)
```

## Archivos del caso de uso

- Backend: `app/Http/Controllers/DashboardController.php` → `estadisticas()` (Flujo 1)
- Frontend: `resources/js/components/Dashboard.jsx` → useEffect + GET (Flujo 1)
- Frontend: `resources/js/components/Postulantes.jsx` → exportar CSV/PDF
- Frontend: `resources/js/components/Docentes.jsx` → exportar CSV/PDF
- Frontend: `resources/js/components/Examenes.jsx` → exportar CSV/PDF
- Frontend: `resources/js/components/Grupos.jsx` → exportar CSV/PDF
- Ruta Dashboard: `GET /api/dashboard/estadisticas`

## Metodos implementados

- `DashboardController@estadisticas()`: COUNT postulaciones por estado + COUNT grupos → Mensajes 1.2, 1.3
- Exportacion CSV (frontend): encabezado BOM UTF-8 + filas → Mensaje 2.5.1
- Exportacion PDF (frontend): jsPDF + autoTable con colores → Mensaje 2.5.2

## Descripcion

Panel de control con indicadores en tiempo real de la gestion actual (2026):
- Total inscritos, aprobados, reprobados, grupos habilitados
- Exportacion CSV con BOM UTF-8 para compatibilidad con Excel
- Exportacion PDF con formato tabular usando jsPDF y jsPDF-AutoTable
- Historial de auditoria via modulo Bitacora (ver CU14)
