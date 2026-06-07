import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ACCIONES = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
const TABLAS   = ['postulantes', 'docentes', 'notas', 'grupos', 'usuarios'];

function AccionBadge({ accion }) {
    const cfg = {
        INSERT: { bg: '#dcfce7', color: '#15803d' },
        UPDATE: { bg: '#fef9c3', color: '#b45309' },
        DELETE: { bg: '#fee2e2', color: '#dc2626' },
        LOGIN:  { bg: '#dbeafe', color: '#1d4ed8' },
        LOGOUT: { bg: '#f1f5f9', color: '#475569' },
    };
    const { bg, color } = cfg[accion] ?? { bg: '#f1f5f9', color: '#475569' };
    return <span style={{ background: bg, color, borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.73rem', fontWeight: 700 }}>{accion}</span>;
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

const FILTROS_VACIOS = { accion: '', tabla_afectada: '', fecha_desde: '', fecha_hasta: '' };

export default function Bitacora({ onBack }) {
    const [registros, setRegistros]   = useState([]);
    const [loading, setLoading]       = useState(true);
    const [stats, setStats]           = useState({ total_registros: 0, registros_hoy: 0, acciones_por_tipo: {}, tablas_mas_afectadas: [] });
    const [filtros, setFiltros]       = useState(FILTROS_VACIOS);
    const [filtrosAplicados, setFiltrosAplicados] = useState(false);
    const [error, setError]           = useState('');

    useEffect(() => { cargarStats(); cargar(); }, []);

    async function cargarStats() {
        try { const res = await fetch('/api/bitacora/estadisticas'); setStats(await res.json()); } catch {}
    }

    async function cargar() {
        setLoading(true); setError('');
        try { const res = await fetch('/api/bitacora'); setRegistros(await res.json()); }
        catch { setError('Error al cargar bitácora.'); }
        finally { setLoading(false); }
    }

    async function filtrar() {
        setLoading(true); setError('');
        const params = new URLSearchParams();
        Object.entries(filtros).forEach(([k, v]) => { if (v) params.append(k, v); });
        try { const res = await fetch(`/api/bitacora/filtrar?${params}`); setRegistros(await res.json()); setFiltrosAplicados(true); }
        catch { setError('Error al filtrar.'); }
        finally { setLoading(false); }
    }

    function limpiar() { setFiltros(FILTROS_VACIOS); setFiltrosAplicados(false); cargar(); }
    const set = (k, v) => setFiltros(f => ({ ...f, [k]: v }));

    function formatFecha(dt) {
        if (!dt) return '—';
        const d = new Date(dt);
        return d.toLocaleDateString('es-BO') + ' ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    const exportarCSV = () => {
        const cab  = ['#','Usuario','Rol','Acción','Tabla','Descripción','Fecha/Hora','IP'];
        const filas = registros.map((r, i) => [i + 1, r.username ?? 'Sistema', r.rol ?? '—', r.accion, r.tabla_afectada ?? '—', r.descripcion, formatFecha(r.fecha_hora), r.direccion_ip ?? '—']);
        const csv  = [cab, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })); a.download = 'bitacora.csv'; a.click();
        URL.revokeObjectURL(a.href);
    };

    const exportarPDF = () => {
        const doc = new jsPDF('landscape');
        const fecha = new Date().toLocaleDateString('es-BO');
        doc.setFontSize(14); doc.setTextColor(26, 58, 107); doc.text('CUP-FICCT - Bitácora del Sistema', 14, 15);
        doc.setFontSize(9); doc.setTextColor(100); doc.text(`${registros.length} registros | Generado: ${fecha}`, 14, 22);
        autoTable(doc, {
            startY: 27,
            head: [['#','Usuario','Acción','Tabla','Descripción','Fecha/Hora','IP']],
            body: registros.map((r, i) => [i + 1, r.username ?? 'Sistema', r.accion, r.tabla_afectada ?? '—', r.descripcion?.slice(0, 50), formatFecha(r.fecha_hora), r.direccion_ip ?? '—']),
            headStyles: { fillColor: [26, 58, 107], fontSize: 7 },
            bodyStyles: { fontSize: 7 },
            columnStyles: { 4: { cellWidth: 60 } },
        });
        doc.save('bitacora.pdf');
    };

    const { total_registros, registros_hoy, acciones_por_tipo } = stats;
    const inserciones    = (acciones_por_tipo?.INSERT ?? 0);
    const modificaciones = (acciones_por_tipo?.UPDATE ?? 0) + (acciones_por_tipo?.DELETE ?? 0);

    const thStyle = { backgroundColor: '#1a3a6b', color: '#ffffff', padding: '12px 16px', fontWeight: '600', fontSize: '13px', letterSpacing: '0.5px', borderBottom: '2px solid #2563eb', whiteSpace: 'nowrap' };
    const tdStyle = { padding: '0.6rem 0.9rem', fontSize: '0.82rem', verticalAlign: 'middle' };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

            {/* ── Navbar ── */}
            <nav style={{ background: 'linear-gradient(135deg,#1a3a6b 0%,#2563eb 100%)', padding: '0 1.5rem', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(26,58,107,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>🗂️</span>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>CUP - FICCT — Bitácora</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>Sistema de Admisión Universitaria</div>
                    </div>
                </div>
                <button onClick={onBack} style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.45)', color: '#fff', borderRadius: 7, padding: '0.35rem 1rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                    ← Volver al Dashboard
                </button>
            </nav>

            <div className="container-fluid" style={{ padding: '1.75rem 2rem' }}>
                <h5 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '1.25rem' }}>Historial de Auditoría del Sistema</h5>

                {/* ── Stats ── */}
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total Registros',        val: total_registros, grad: 'linear-gradient(135deg,#1a3a6b,#2563eb)', icon: '📊' },
                        { label: 'Registros Hoy',          val: registros_hoy,   grad: 'linear-gradient(135deg,#15803d,#16a34a)', icon: '📅' },
                        { label: 'Inserciones',            val: inserciones,     grad: 'linear-gradient(135deg,#6d28d9,#7c3aed)', icon: '➕' },
                        { label: 'Modif. / Eliminaciones', val: modificaciones,  grad: 'linear-gradient(135deg,#d97706,#f59e0b)', icon: '✏️' },
                    ].map(({ label, val, grad, icon }) => (
                        <div className="col-md-3" key={label}>
                            <div style={{ background: grad, borderRadius: 14, padding: '1.25rem 1.5rem', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '2.6rem', opacity: 0.2 }}>{icon}</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.9 }}>{label}</div>
                                <div style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.1, marginTop: '0.25rem' }}>{val}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {error && <div className="alert alert-danger py-2 small mb-3" style={{ borderRadius: 8 }}>{error}</div>}

                {/* ── Filters ── */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8edf5', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '1.25rem', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(90deg,#475569,#64748b)', padding: '0.7rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1rem' }}>🔎</span>
                        <h6 style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>Filtros</h6>
                    </div>
                    <div style={{ padding: '1rem 1.25rem' }}>
                        <div className="row g-2 align-items-end">
                            <div className="col-md-2">
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: '0.25rem' }}>Acción</label>
                                <select className="form-select form-select-sm" style={{ borderRadius: 7, borderColor: '#e2e8f0' }} value={filtros.accion} onChange={e => set('accion', e.target.value)}>
                                    <option value="">Todos</option>
                                    {ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: '0.25rem' }}>Tabla</label>
                                <select className="form-select form-select-sm" style={{ borderRadius: 7, borderColor: '#e2e8f0' }} value={filtros.tabla_afectada} onChange={e => set('tabla_afectada', e.target.value)}>
                                    <option value="">Todas</option>
                                    {TABLAS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: '0.25rem' }}>Fecha desde</label>
                                <input type="date" className="form-control form-control-sm" style={{ borderRadius: 7, borderColor: '#e2e8f0' }} value={filtros.fecha_desde} onChange={e => set('fecha_desde', e.target.value)} />
                            </div>
                            <div className="col-md-2">
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: '0.25rem' }}>Fecha hasta</label>
                                <input type="date" className="form-control form-control-sm" style={{ borderRadius: 7, borderColor: '#e2e8f0' }} value={filtros.fecha_hasta} onChange={e => set('fecha_hasta', e.target.value)} />
                            </div>
                            <div className="col-md-4 d-flex gap-2">
                                <button style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', color: '#fff', border: 'none', borderRadius: 7, padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }} onClick={filtrar}>Filtrar</button>
                                <button style={{ background: 'transparent', border: '1.5px solid #94a3b8', color: '#64748b', borderRadius: 7, padding: '0.4rem 0.9rem', cursor: filtrosAplicados ? 'pointer' : 'not-allowed', fontSize: '0.85rem' }} onClick={limpiar} disabled={!filtrosAplicados}>
                                    Limpiar filtros
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Records table ── */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ background: '#1a3a6b', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>Registros</span>
                            <span style={{ color: 'rgba(255,255,255,0.55)', marginLeft: 8, fontSize: '0.78rem' }}>
                                Mostrando {registros.length} registro{registros.length !== 1 ? 's' : ''}
                                {filtrosAplicados && <span style={{ color: '#f59e0b', marginLeft: 4 }}>(filtrados)</span>}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, padding: '0.3rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }} onClick={exportarCSV} disabled={!registros.length}>⬇ CSV</button>
                            <button style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, padding: '0.3rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }} onClick={exportarPDF} disabled={!registros.length}>⬇ PDF</button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner-border text-primary" /></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-sm mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr style={{ background: '#1a3a6b' }}>
                                        {['#','Usuario','Rol','Acción','Tabla Afectada','Descripción','Fecha y Hora','IP'].map(h => (
                                            <th key={h} style={thStyle}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {registros.length === 0 ? (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                            <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🗂️</div>
                                            No hay registros en la bitácora.
                                        </td></tr>
                                    ) : registros.map((r, i) => (
                                        <TR key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                            <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '0.75rem' }}>{i + 1}</td>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{r.username ?? <span style={{ color: '#94a3b8' }}>Sistema</span>}</td>
                                            <td style={{ ...tdStyle, color: '#64748b' }}>{r.rol ?? '—'}</td>
                                            <td style={tdStyle}><AccionBadge accion={r.accion} /></td>
                                            <td style={tdStyle}>
                                                {r.tabla_afectada
                                                    ? <code style={{ background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.75rem', color: '#1e293b' }}>{r.tabla_afectada}</code>
                                                    : <span style={{ color: '#94a3b8' }}>—</span>
                                                }
                                            </td>
                                            <td style={{ ...tdStyle, maxWidth: 320 }}>{r.descripcion}</td>
                                            <td style={{ ...tdStyle, color: '#64748b', whiteSpace: 'nowrap', fontSize: '0.76rem' }}>{formatFecha(r.fecha_hora)}</td>
                                            <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '0.76rem' }}>{r.direccion_ip ?? '—'}</td>
                                        </TR>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
