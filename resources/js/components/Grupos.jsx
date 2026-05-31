import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Modulo de gestion de grupos (CU5/CU6 - Administrador).
 *
 * Permite visualizar y generar grupos de estudio automaticamente.
 * Formula de distribucion: cantidadGrupos = CEIL(totalInscritos / 70)
 * Los postulantes se distribuyen por round-robin entre los grupos creados.
 *
 * Asignacion de aulas y horarios por bloques de turno:
 * - Turno 0 (mañana):  horarios 0-3  del array ordenado por id
 * - Turno 1 (tarde):   horarios 4-7
 * - Turno 2 (noche):   horarios 8-11
 *
 * Filtrado doble en frontend: primero por turno, luego por texto de busqueda
 * (busca en nombre de grupo, aula y horario). El CSV exportado incluye
 * solo los grupos del filtro activo.
 *
 * @param {Function} onBack Callback para volver al Dashboard
 * @param {Object}   user   Usuario autenticado (para header X-User-Id en bitacora)
 */

// Configuracion de los botones de filtro por turno
const TURNOS = [
    { key: 'todos',  label: 'Todos',   icon: '📋', btnClass: 'btn-primary' },
    { key: 'Manana', label: 'Mañana',  icon: '🌅', btnClass: 'btn-warning'  },
    { key: 'Tarde',  label: 'Tarde',   icon: '🌇', btnClass: 'btn-orange'   },
    { key: 'Noche',  label: 'Noche',   icon: '🌙', btnClass: 'btn-dark'     },
];

function TurnoBadge({ turno }) {
    if (!turno) return <span className="text-muted">—</span>;
    if (turno === 'Manana') return <span className="badge bg-warning text-dark">🌅 Mañana</span>;
    if (turno === 'Tarde')  return <span className="badge text-white" style={{ backgroundColor: '#fd7e14' }}>🌇 Tarde</span>;
    return <span className="badge bg-dark">🌙 Noche</span>;
}

export default function Grupos({ onBack, user }) {
    const [datos, setDatos] = useState({ grupos: [], total_inscritos: 0, grupos_necesarios: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filtroTurno, setFiltroTurno] = useState('todos');

    const [busquedaGrupo, setBusquedaGrupo] = useState('');
    const [generando, setGenerando] = useState(false);
    const [msgGenerar, setMsgGenerar] = useState('');

    const [grupoDetalle, setGrupoDetalle] = useState(null);
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    const gestion = new Date().getFullYear().toString();

    useEffect(() => {
        cargarGrupos();
    }, []);

    async function cargarGrupos() {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/grupos');
            const data = await res.json();
            setDatos(data);
        } catch {
            setError('Error al cargar grupos.');
        } finally {
            setLoading(false);
        }
    }

    async function generarGrupos() {
        setGenerando(true);
        setMsgGenerar('');
        setError('');
        try {
            const res = await fetch('/api/grupos/asignar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-User-Id': user?.id ?? '' },
                body: JSON.stringify({ gestion }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Error al generar grupos.');
                return;
            }
            setMsgGenerar(data.message);
            setGrupoDetalle(null);
            cargarGrupos();
        } catch {
            setError('Error de conexión.');
        } finally {
            setGenerando(false);
        }
    }

    async function verDetalle(id) {
        setLoadingDetalle(true);
        setGrupoDetalle(null);
        try {
            const res = await fetch(`/api/grupos/${id}`);
            const data = await res.json();
            setGrupoDetalle(data);
        } catch {
            setError('Error al cargar detalle del grupo.');
        } finally {
            setLoadingDetalle(false);
        }
    }

    const { grupos, total_inscritos, grupos_necesarios } = datos;

    // 1. Filtrar por turno
    const gruposPorTurno = filtroTurno === 'todos'
        ? grupos
        : grupos.filter(g => g.turno === filtroTurno);

    // 2. Filtrar por texto de búsqueda (sobre el resultado del turno)
    const gruposFiltrados = busquedaGrupo.trim() === ''
        ? gruposPorTurno
        : gruposPorTurno.filter(g => {
            const q = busquedaGrupo.toLowerCase();
            return (g.nombre      || '').toLowerCase().includes(q)
                || (g.aula        || '').toLowerCase().includes(q)
                || (g.dias        || '').toLowerCase().includes(q)
                || (g.horario_ini || '').toLowerCase().includes(q)
                || (g.horario_fin || '').toLowerCase().includes(q);
        });

    const turnoLabel = {
        todos:  'Todos los Turnos',
        Manana: 'Turno Mañana',
        Tarde:  'Turno Tarde',
        Noche:  'Turno Noche',
    }[filtroTurno] ?? filtroTurno;

    const turnoTexto = (turno) => {
        if (turno === 'Manana') return 'Mañana';
        if (turno === 'Tarde')  return 'Tarde';
        if (turno === 'Noche')  return 'Noche';
        return '—';
    };

    const exportarCSV = () => {
        const cabecera = ['Grupo', 'Gestion', 'Estudiantes', 'Aula', 'Horario', 'Turno'];
        const filas = gruposFiltrados.map(g => [
            g.nombre,
            g.gestion,
            g.total_estudiantes,
            g.aula ?? '—',
            g.horario_ini ? `${g.horario_ini}-${g.horario_fin} (${g.dias})` : '—',
            turnoTexto(g.turno),
        ]);
        const csv = [cabecera, ...filas]
            .map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const nombreArchivo = `grupos_${filtroTurno.toLowerCase()}_${gestion}.csv`;
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = nombreArchivo; a.click();
        URL.revokeObjectURL(url);
    };

    const exportarPDF = () => {
        const doc   = new jsPDF();
        const fecha = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });

        doc.setFontSize(16);
        doc.setTextColor(13, 110, 253);
        doc.text('CUP-FICCT - Reporte de Grupos', 14, 18);

        doc.setFontSize(11);
        doc.setTextColor(40);
        doc.text(turnoLabel, 14, 27);

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Gestión: ${gestion}`, 14, 34);
        doc.text(`Generado: ${fecha}`, 14, 39);

        const COLOR_MANANA = [255, 249, 196];
        const COLOR_TARDE  = [255, 224, 178];
        const COLOR_NOCHE  = [187, 222, 251];
        const COLOR_DEF    = [255, 255, 255];

        const bodyRows = gruposFiltrados.map(g => {
            const color = g.turno === 'Manana' ? COLOR_MANANA
                        : g.turno === 'Tarde'  ? COLOR_TARDE
                        : g.turno === 'Noche'  ? COLOR_NOCHE
                        : COLOR_DEF;
            const c = v => ({ content: v, styles: { fillColor: color } });
            return [
                c(g.nombre),
                c(g.gestion),
                { content: g.total_estudiantes, styles: { fillColor: color, halign: 'center' } },
                c(g.aula ?? '—'),
                c(g.horario_ini ? `${g.horario_ini}-${g.horario_fin}\n${g.dias}` : '—'),
                c(turnoTexto(g.turno)),
            ];
        });

        autoTable(doc, {
            startY: 45,
            head: [['Grupo', 'Gestión', 'Estudiantes', 'Aula', 'Horario', 'Turno']],
            body: bodyRows,
            headStyles:  { fillColor: [13, 110, 253], fontSize: 9, fontStyle: 'bold' },
            bodyStyles:  { fontSize: 8 },
            columnStyles: { 2: { halign: 'center' } },
        });

        const finalY = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.text(`Total: ${gruposFiltrados.length} grupo${gruposFiltrados.length !== 1 ? 's' : ''}`, 14, finalY);

        const nombreArchivo = `grupos_${filtroTurno.toLowerCase()}_${gestion}.pdf`;
        doc.save(nombreArchivo);
    };

    return (
        <div>
            <nav className="navbar navbar-dark bg-primary px-4">
                <span className="navbar-brand fw-bold">CUP - FICCT &mdash; Grupos</span>
                <button className="btn btn-outline-light btn-sm" onClick={onBack}>
                    &larr; Volver al Dashboard
                </button>
            </nav>

            <div className="container-fluid p-4">
                <h4 className="mb-4">Asignación Automática de Grupos</h4>

                {/* Tarjetas de resumen */}
                <div className="row g-3 mb-4">
                    <div className="col-md-4">
                        <div className="card text-white bg-primary h-100">
                            <div className="card-body">
                                <h6 className="card-title">Total Inscritos</h6>
                                <h2 className="fw-bold">{total_inscritos}</h2>
                                <small>Gestión {gestion}</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card text-white bg-info h-100">
                            <div className="card-body">
                                <h6 className="card-title">Grupos Necesarios</h6>
                                <h2 className="fw-bold">{grupos_necesarios}</h2>
                                <small>CEIL({total_inscritos} / 70)</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card text-white bg-success h-100">
                            <div className="card-body">
                                <h6 className="card-title">Grupos Generados</h6>
                                <h2 className="fw-bold">{grupos.length}</h2>
                                <small>máx. 70 estudiantes c/u</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                <div className="d-flex align-items-center gap-3 mb-3">
                    <button
                        className="btn btn-warning fw-bold"
                        onClick={generarGrupos}
                        disabled={generando || total_inscritos === 0}
                    >
                        {generando
                            ? <><span className="spinner-border spinner-border-sm me-2" />Generando...</>
                            : '⚡ Generar Grupos Automáticamente'
                        }
                    </button>
                    {total_inscritos === 0 && (
                        <span className="text-muted small">No hay postulaciones registradas.</span>
                    )}
                </div>

                {/* Barra de reportes */}
                {grupos.length > 0 && (
                    <div className="d-flex align-items-center justify-content-between mb-4 p-3 bg-light rounded border">
                        <span className="fw-semibold text-secondary">
                            Mostrando grupos:{' '}
                            <strong className="text-dark">{turnoLabel}</strong>
                            <span className="text-muted fw-normal ms-2">
                                ({gruposFiltrados.length} de {grupos.length})
                            </span>
                        </span>
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-success btn-sm"
                                onClick={exportarCSV}
                                disabled={gruposFiltrados.length === 0}
                            >
                                ⬇ Exportar CSV
                            </button>
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={exportarPDF}
                                disabled={gruposFiltrados.length === 0}
                            >
                                ⬇ Exportar PDF
                            </button>
                        </div>
                    </div>
                )}

                {msgGenerar && (
                    <div className="alert alert-success alert-dismissible">
                        {msgGenerar}
                        <button type="button" className="btn-close" onClick={() => setMsgGenerar('')} />
                    </div>
                )}
                {error && (
                    <div className="alert alert-danger alert-dismissible">
                        {error}
                        <button type="button" className="btn-close" onClick={() => setError('')} />
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" />
                    </div>
                ) : grupos.length === 0 ? (
                    <div className="alert alert-info">
                        No hay grupos generados. Presiona <strong>Generar Grupos Automáticamente</strong> para comenzar.
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {/* Lista de grupos — siempre ancho completo */}
                        <div>
                            <div className="card shadow-sm">
                                <div className="card-header bg-dark text-white">
                                    {/* Buscador */}
                                    <div className="mb-2">
                                        <div className="input-group input-group-sm">
                                            <input
                                                type="text"
                                                className="form-control bg-secondary border-0 text-white"
                                                placeholder="🔍 Buscar por nombre de grupo, aula u horario..."
                                                value={busquedaGrupo}
                                                onChange={e => setBusquedaGrupo(e.target.value)}
                                                style={{ '::placeholder': { color: '#adb5bd' } }}
                                            />
                                            {busquedaGrupo && (
                                                <button
                                                    className="btn btn-secondary border-0"
                                                    onClick={() => setBusquedaGrupo('')}
                                                    title="Limpiar búsqueda"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Título + botones de turno */}
                                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                        <div>
                                            <strong>Lista de Grupos</strong>
                                            <span className="text-secondary ms-2 small fw-normal">
                                                Mostrando {gruposFiltrados.length} de {grupos.length} grupos
                                            </span>
                                        </div>
                                        <div className="btn-group btn-group-sm" role="group">
                                            {TURNOS.map(t => (
                                                <button
                                                    key={t.key}
                                                    type="button"
                                                    className={`btn ${t.key === 'Tarde' ? '' : t.btnClass} ${filtroTurno === t.key ? 'active' : 'opacity-75'}`}
                                                    style={t.key === 'Tarde' ? {
                                                        backgroundColor: filtroTurno === 'Tarde' ? '#fd7e14' : '#c96000',
                                                        borderColor: '#fd7e14',
                                                        color: 'white',
                                                    } : {}}
                                                    onClick={() => { setFiltroTurno(t.key); setGrupoDetalle(null); }}
                                                >
                                                    {t.icon} {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="table-secondary">
                                            <tr>
                                                <th>Grupo</th>
                                                <th>Gestión</th>
                                                <th className="text-center">Estudiantes</th>
                                                <th>Aula</th>
                                                <th>Horario</th>
                                                <th>Turno</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {gruposFiltrados.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="text-center text-muted py-3">
                                                        No hay grupos en el turno seleccionado.
                                                    </td>
                                                </tr>
                                            ) : gruposFiltrados.map(g => (
                                                <tr
                                                    key={g.id}
                                                    className={grupoDetalle?.grupo?.id === g.id ? 'table-primary' : ''}
                                                >
                                                    <td className="fw-bold">{g.nombre}</td>
                                                    <td>{g.gestion}</td>
                                                    <td className="text-center">
                                                        <span className="badge bg-primary rounded-pill">
                                                            {g.total_estudiantes}
                                                        </span>
                                                    </td>
                                                    <td className="text-muted">{g.aula ?? '—'}</td>
                                                    <td className="text-muted small">
                                                        {g.horario_ini
                                                            ? `${g.horario_ini}–${g.horario_fin} (${g.dias})`
                                                            : '—'}
                                                    </td>
                                                    <td><TurnoBadge turno={g.turno} /></td>
                                                    <td>
                                                        <button
                                                            className="btn btn-outline-primary btn-sm"
                                                            onClick={() => verDetalle(g.id)}
                                                        >
                                                            Ver
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Detalle del grupo — debajo, ancho completo */}
                        {(grupoDetalle || loadingDetalle) && (
                            <div style={{ animation: 'fadeInDown .2s ease' }}>
                                <div className="card shadow-sm border-primary">
                                    <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                                        <strong>
                                            {loadingDetalle
                                                ? 'Cargando...'
                                                : `${grupoDetalle.grupo.nombre} — ${grupoDetalle.total} estudiante${grupoDetalle.total !== 1 ? 's' : ''}`
                                            }
                                        </strong>
                                        <button
                                            className="btn-close btn-close-white btn-sm"
                                            onClick={() => setGrupoDetalle(null)}
                                        />
                                    </div>
                                    {loadingDetalle ? (
                                        <div className="text-center py-4">
                                            <div className="spinner-border text-primary" />
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-sm table-striped mb-0">
                                                <thead className="table-secondary">
                                                    <tr>
                                                        <th>#</th>
                                                        <th>CI</th>
                                                        <th>Apellidos</th>
                                                        <th>Nombres</th>
                                                        <th>Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {grupoDetalle.estudiantes.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="text-muted text-center py-3">
                                                                Sin estudiantes asignados
                                                            </td>
                                                        </tr>
                                                    ) : grupoDetalle.estudiantes.map((e, i) => (
                                                        <tr key={e.postulacion_id}>
                                                            <td className="text-muted">{i + 1}</td>
                                                            <td>{e.ci}</td>
                                                            <td className="fw-bold">{e.apellidos}</td>
                                                            <td>{e.nombres}</td>
                                                            <td>
                                                                <span className={`badge ${e.estado_admision === 'APROBADO' ? 'bg-success' : 'bg-secondary'}`}>
                                                                    {e.estado_admision}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
