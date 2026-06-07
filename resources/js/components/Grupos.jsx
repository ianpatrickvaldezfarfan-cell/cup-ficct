/**
 * CU10 - GESTIONAR GRUPOS
 * Diagrama de Secuencia:
 *
 * Mensaje 1: solicitarGeneracionGrupos(gestion: 2026)
 *   → handleGenerarGrupos() al hacer clic en botón
 *
 * Mensaje 1.1: procesarGeneracion(gestion)
 *   → POST /api/grupos/asignar
 *
 * Mensaje 1.12: mostrarResumen(totalInscritos, gruposHabilitados,
 *              estudiantesPorGrupo, turnos)
 *   → Actualiza tarjetas de estadísticas y tabla de grupos
 *
 * Carga inicial:
 *   → useEffect → GET /api/grupos → setDatos({ grupos, total_inscritos })
 */
import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TURNOS = [
    { key: 'todos',  label: 'Todos',  icon: '📋', actBg: '#1a3a6b', actColor: '#fff', inaBg: '#eff6ff', inaColor: '#1a3a6b' },
    { key: 'Manana', label: 'Mañana', icon: '🌅', actBg: '#d97706', actColor: '#fff', inaBg: '#fef9c3', inaColor: '#b45309' },
    { key: 'Tarde',  label: 'Tarde',  icon: '🌇', actBg: '#ea580c', actColor: '#fff', inaBg: '#ffedd5', inaColor: '#c2410c' },
    { key: 'Noche',  label: 'Noche',  icon: '🌙', actBg: '#3730a3', actColor: '#fff', inaBg: '#e0e7ff', inaColor: '#3730a3' },
];

function TurnoBadge({ turno }) {
    if (!turno) return <span style={{ color: '#94a3b8' }}>—</span>;
    if (turno === 'Manana') return <span style={{ background: '#fef9c3', color: '#b45309', borderRadius: 20, padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}>🌅 Mañana</span>;
    if (turno === 'Tarde')  return <span style={{ background: '#ffedd5', color: '#c2410c', borderRadius: 20, padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}>🌇 Tarde</span>;
    return <span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 20, padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}>🌙 Noche</span>;
}

function EstadoBadge({ estado }) {
    const cfg = {
        'APROBADO':    { bg: '#dcfce7', color: '#15803d' },
        'REPROBADO':   { bg: '#fee2e2', color: '#dc2626' },
        'EN PROCESO':  { bg: '#dbeafe', color: '#1d4ed8' },
        'PENDIENTE_PAGO': { bg: '#fef9c3', color: '#b45309' },
    };
    const { bg, color } = cfg[estado] ?? { bg: '#f1f5f9', color: '#475569' };
    return <span style={{ background: bg, color, borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.73rem', fontWeight: 700 }}>{estado}</span>;
}

function TR({ children, style, ...rest }) {
    const [hov, setHov] = useState(false);
    return (
        <tr {...rest} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ ...style, background: hov ? '#eff6ff' : (style?.background ?? 'transparent'), transition: 'background 0.12s' }}>
            {children}
        </tr>
    );
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

    useEffect(() => { cargarGrupos(); }, []);

    async function cargarGrupos() {
        setLoading(true); setError('');
        try {
            const res = await fetch('/api/grupos');
            const data = await res.json();
            setDatos(data);
        } catch { setError('Error al cargar grupos.'); }
        finally { setLoading(false); }
    }

    async function generarGrupos() {
        setGenerando(true); setMsgGenerar(''); setError('');
        try {
            const res = await fetch('/api/grupos/asignar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-User-Id': user?.id ?? '' },
                body: JSON.stringify({ gestion }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || 'Error al generar grupos.'); return; }
            setMsgGenerar(data.message);
            setGrupoDetalle(null);
            cargarGrupos();
        } catch { setError('Error de conexión.'); }
        finally { setGenerando(false); }
    }

    async function verDetalle(id) {
        setLoadingDetalle(true); setGrupoDetalle(null);
        try {
            const res = await fetch(`/api/grupos/${id}`);
            setGrupoDetalle(await res.json());
        } catch { setError('Error al cargar detalle del grupo.'); }
        finally { setLoadingDetalle(false); }
    }

    const { grupos, total_inscritos, grupos_necesarios } = datos;

    const gruposPorTurno = filtroTurno === 'todos' ? grupos : grupos.filter(g => g.turno === filtroTurno);
    const gruposFiltrados = busquedaGrupo.trim() === '' ? gruposPorTurno : gruposPorTurno.filter(g => {
        const q = busquedaGrupo.toLowerCase();
        return (g.nombre || '').toLowerCase().includes(q)
            || (g.aula || '').toLowerCase().includes(q)
            || (g.dias || '').toLowerCase().includes(q)
            || (g.horario_ini || '').toLowerCase().includes(q);
    });

    const turnoLabel = { todos: 'Todos los Turnos', Manana: 'Turno Mañana', Tarde: 'Turno Tarde', Noche: 'Turno Noche' }[filtroTurno] ?? filtroTurno;
    const turnoTexto = t => t === 'Manana' ? 'Mañana' : t === 'Tarde' ? 'Tarde' : t === 'Noche' ? 'Noche' : '—';

    const exportarCSV = () => {
        const cabecera = ['Grupo','Gestion','Estudiantes','Aula','Horario','Turno'];
        const filas = gruposFiltrados.map(g => [g.nombre, g.gestion, g.total_estudiantes, g.aula ?? '—', g.horario_ini ? `${g.horario_ini}-${g.horario_fin} (${g.dias})` : '—', turnoTexto(g.turno)]);
        const csv = [cabecera, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = `grupos_${filtroTurno.toLowerCase()}_${gestion}.csv`; a.click();
        URL.revokeObjectURL(a.href);
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        const fecha = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.setFontSize(16); doc.setTextColor(26, 58, 107); doc.text('CUP-FICCT - Reporte de Grupos', 14, 18);
        doc.setFontSize(11); doc.setTextColor(40); doc.text(turnoLabel, 14, 27);
        doc.setFontSize(9); doc.setTextColor(100); doc.text(`Gestión: ${gestion}`, 14, 34); doc.text(`Generado: ${fecha}`, 14, 39);
        const COLOR_M = [255,249,196]; const COLOR_T = [255,224,178]; const COLOR_N = [187,222,251];
        autoTable(doc, {
            startY: 45,
            head: [['Grupo','Gestión','Estudiantes','Aula','Horario','Turno']],
            body: gruposFiltrados.map(g => {
                const color = g.turno === 'Manana' ? COLOR_M : g.turno === 'Tarde' ? COLOR_T : g.turno === 'Noche' ? COLOR_N : [255,255,255];
                const c = v => ({ content: v, styles: { fillColor: color } });
                return [c(g.nombre), c(g.gestion), { content: g.total_estudiantes, styles: { fillColor: color, halign: 'center' } }, c(g.aula ?? '—'), c(g.horario_ini ? `${g.horario_ini}-${g.horario_fin}` : '—'), c(turnoTexto(g.turno))];
            }),
            headStyles: { fillColor: [26, 58, 107], fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fontSize: 8 },
        });
        doc.save(`grupos_${filtroTurno.toLowerCase()}_${gestion}.pdf`);
    };

    const thStyle = { backgroundColor: '#1a3a6b', color: '#ffffff', padding: '12px 16px', fontWeight: '600', fontSize: '13px', letterSpacing: '0.5px', borderBottom: '2px solid #2563eb', whiteSpace: 'nowrap' };
    const tdStyle = { padding: '0.7rem 1rem', fontSize: '0.88rem', verticalAlign: 'middle' };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

            {/* ── Navbar ── */}
            <nav style={{ background: 'linear-gradient(135deg,#1a3a6b 0%,#2563eb 100%)', padding: '0 1.5rem', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(26,58,107,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>🏫</span>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>CUP - FICCT — Asignación de Grupos</div>
                        <div className="d-none d-sm-block" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>Sistema de Admisión Universitaria</div>
                    </div>
                </div>
                <button onClick={onBack} style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.45)', color: '#fff', borderRadius: 7, padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                    <span className="d-none d-sm-inline">← Volver al Dashboard</span>
                    <span className="d-sm-none">←</span>
                </button>
            </nav>

            <div className="container-fluid px-3 px-md-4" style={{ paddingTop: '1.75rem', paddingBottom: '1.75rem' }}>
                <h5 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '1.25rem' }}>Asignación Automática de Grupos</h5>

                {/* ── Stats ── */}
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total Inscritos',    val: total_inscritos,    grad: 'linear-gradient(135deg,#1a3a6b,#2563eb)', icon: '👥', sub: `Gestión ${gestion}` },
                        { label: 'Grupos Necesarios',  val: grupos_necesarios,  grad: 'linear-gradient(135deg,#0891b2,#06b6d4)', icon: '🔢', sub: `CEIL(${total_inscritos}/70)` },
                        { label: 'Grupos Generados',   val: grupos.length,      grad: 'linear-gradient(135deg,#15803d,#16a34a)', icon: '✅', sub: 'máx. 70 estudiantes c/u' },
                    ].map(({ label, val, grad, icon, sub }) => (
                        <div className="col-md-4" key={label}>
                            <div style={{ background: grad, borderRadius: 14, padding: '1.25rem 1.5rem', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '2.6rem', opacity: 0.2 }}>{icon}</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.9 }}>{label}</div>
                                <div style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.1, marginTop: '0.25rem' }}>{val}</div>
                                <div style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: '0.15rem' }}>{sub}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Generate button ── */}
                <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={generarGrupos}
                        disabled={generando || total_inscritos === 0}
                        style={{ background: generando || total_inscritos === 0 ? '#94a3b8' : 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff', border: 'none', borderRadius: 9, padding: '0.65rem 1.5rem', fontWeight: 700, fontSize: '0.95rem', cursor: generando || total_inscritos === 0 ? 'not-allowed' : 'pointer', boxShadow: generando || total_inscritos === 0 ? 'none' : '0 4px 16px rgba(217,119,6,0.4)', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        {generando ? <><span className="spinner-border spinner-border-sm" />Generando...</> : '⚡ Generar Grupos Automáticamente'}
                    </button>
                    {total_inscritos === 0 && <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No hay postulaciones registradas.</span>}
                </div>

                {/* ── Report bar ── */}
                {grupos.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8edf5', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '0.85rem 1.25rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                            Mostrando grupos: <strong style={{ color: '#1a3a6b' }}>{turnoLabel}</strong>
                            <span style={{ color: '#94a3b8', marginLeft: 6 }}>({gruposFiltrados.length} de {grupos.length})</span>
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={exportarCSV} disabled={gruposFiltrados.length === 0} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>⬇ CSV</button>
                            <button onClick={exportarPDF} disabled={gruposFiltrados.length === 0} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>⬇ PDF</button>
                        </div>
                    </div>
                )}

                {/* ── Messages ── */}
                {msgGenerar && <div className="alert alert-success alert-dismissible py-2 small mb-3" style={{ borderRadius: 8 }}>{msgGenerar}<button type="button" className="btn-close btn-sm" onClick={() => setMsgGenerar('')} /></div>}
                {error && <div className="alert alert-danger alert-dismissible py-2 small mb-3" style={{ borderRadius: 8 }}>{error}<button type="button" className="btn-close btn-sm" onClick={() => setError('')} /></div>}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}><div className="spinner-border text-primary" /></div>
                ) : grupos.length === 0 ? (
                    <div style={{ background: '#eff6ff', borderRadius: 12, padding: '2rem', textAlign: 'center', border: '1px solid #bfdbfe' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏫</div>
                        <p style={{ color: '#1d4ed8', fontWeight: 600, margin: 0 }}>No hay grupos generados. Presiona <strong>⚡ Generar Grupos Automáticamente</strong> para comenzar.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Groups table card */}
                        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                            {/* Header with search + turn filters */}
                            <div style={{ background: '#1a3a6b', padding: '0.85rem 1.25rem' }}>
                                <div style={{ marginBottom: '0.65rem' }}>
                                    <div style={{ position: 'relative', maxWidth: 360 }}>
                                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', pointerEvents: 'none' }}>🔍</span>
                                        <input
                                            type="text"
                                            style={{ paddingLeft: '2rem', borderRadius: 7, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.85rem', height: 34, width: '100%', outline: 'none' }}
                                            placeholder="Buscar grupo, aula u horario..."
                                            value={busquedaGrupo}
                                            onChange={e => setBusquedaGrupo(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <div>
                                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Lista de Grupos</span>
                                        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', marginLeft: 8 }}>
                                            {gruposFiltrados.length} de {grupos.length} grupos
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                        {TURNOS.map(t => (
                                            <button
                                                key={t.key}
                                                onClick={() => { setFiltroTurno(t.key); setGrupoDetalle(null); }}
                                                style={{ background: filtroTurno === t.key ? t.actBg : t.inaBg, color: filtroTurno === t.key ? t.actColor : t.inaColor, border: 'none', borderRadius: 20, padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                                            >
                                                {t.icon} {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr style={{ background: '#1a3a6b' }}>
                                            {['Grupo','Gestión','Estudiantes','Aula','Horario','Turno',''].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gruposFiltrados.length === 0 ? (
                                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No hay grupos en el turno seleccionado.</td></tr>
                                        ) : gruposFiltrados.map((g, i) => (
                                            <TR key={g.id} style={{ background: grupoDetalle?.grupo?.id === g.id ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                <td style={{ ...tdStyle, fontWeight: 700, color: '#1e293b' }}>{g.nombre}</td>
                                                <td style={{ ...tdStyle, color: '#64748b' }}>{g.gestion}</td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                    <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: '50%', width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>{g.total_estudiantes}</span>
                                                </td>
                                                <td style={{ ...tdStyle, color: '#64748b' }}>{g.aula ?? '—'}</td>
                                                <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.82rem' }}>
                                                    {g.horario_ini ? `${g.horario_ini}–${g.horario_fin} (${g.dias})` : '—'}
                                                </td>
                                                <td style={tdStyle}><TurnoBadge turno={g.turno} /></td>
                                                <td style={tdStyle}>
                                                    <button onClick={() => verDetalle(g.id)} style={{ background: 'transparent', border: '1.5px solid #2563eb', color: '#2563eb', borderRadius: 7, padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                                                        👁️ Ver
                                                    </button>
                                                </td>
                                            </TR>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Detail panel */}
                        {(grupoDetalle || loadingDetalle) && (
                            <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #2563eb', boxShadow: '0 4px 20px rgba(37,99,235,0.12)', overflow: 'hidden' }}>
                                <div style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
                                        {loadingDetalle ? 'Cargando detalle...' : `${grupoDetalle.grupo.nombre} — ${grupoDetalle.total} estudiante${grupoDetalle.total !== 1 ? 's' : ''}`}
                                    </span>
                                    <button onClick={() => setGrupoDetalle(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
                                </div>
                                {loadingDetalle ? (
                                    <div style={{ textAlign: 'center', padding: '2.5rem' }}><div className="spinner-border text-primary" /></div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-sm mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                            <thead>
                                                <tr style={{ background: '#1a3a6b' }}>
                                                    {['#','CI','Apellidos','Nombres','Estado'].map(h => (
                                                        <th key={h} style={thStyle}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {grupoDetalle.estudiantes.length === 0 ? (
                                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>Sin estudiantes asignados</td></tr>
                                                ) : grupoDetalle.estudiantes.map((e, i) => (
                                                    <TR key={e.postulacion_id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                        <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '0.78rem' }}>{i + 1}</td>
                                                        <td style={tdStyle}>{e.ci}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 600 }}>{e.apellidos}</td>
                                                        <td style={tdStyle}>{e.nombres}</td>
                                                        <td style={tdStyle}><EstadoBadge estado={e.estado_admision} /></td>
                                                    </TR>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
