import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ESTADOS = ['EN PROCESO', 'APROBADO', 'REPROBADO', 'PENDIENTE_PAGO'];

function EstadoBadge({ estado }) {
    const cfg = {
        'EN PROCESO':     { bg: '#dbeafe', color: '#1d4ed8', label: 'En Proceso'    },
        'APROBADO':       { bg: '#dcfce7', color: '#15803d', label: 'Aprobado'      },
        'REPROBADO':      { bg: '#fee2e2', color: '#dc2626', label: 'Reprobado'     },
        'PENDIENTE_PAGO': { bg: '#fef9c3', color: '#b45309', label: 'Pago Pendiente'},
    };
    const { bg, color, label } = cfg[estado] ?? { bg: '#f1f5f9', color: '#475569', label: estado };
    return (
        <span style={{ background: bg, color, borderRadius: 20, padding: '0.2rem 0.7rem', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {label}
        </span>
    );
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

export default function Postulaciones({ onBack }) {
    const [postulaciones, setPostulaciones] = useState([]);
    const [loading, setLoading]             = useState(true);
    const [busqueda, setBusqueda]           = useState('');
    const [filtroEstado, setFiltroEstado]   = useState('todos');
    const [actualizando, setActualizando]   = useState(null);
    const [mensaje, setMensaje]             = useState('');
    const [error, setError]                 = useState('');

    useEffect(() => { cargar(); }, []);

    async function cargar() {
        setLoading(true);
        try {
            const res  = await fetch('/api/postulaciones');
            const data = await res.json();
            setPostulaciones(data);
        } catch {
            setError('Error al cargar postulaciones.');
        } finally {
            setLoading(false);
        }
    }

    async function cambiarEstado(id, nuevoEstado) {
        setActualizando(id);
        try {
            const res = await fetch(`/api/postulaciones/${id}/estado`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body:    JSON.stringify({ estado_admision: nuevoEstado }),
            });
            const data = await res.json();
            if (res.ok) {
                setPostulaciones(ps => ps.map(p => p.id === id ? { ...p, estado_admision: nuevoEstado } : p));
                setMensaje('Estado actualizado correctamente.');
                setTimeout(() => setMensaje(''), 3000);
            } else {
                setError(data.message || 'Error al actualizar estado.');
            }
        } catch {
            setError('Error de conexión.');
        } finally {
            setActualizando(null);
        }
    }

    /* ─── Filtered data (used by table AND exports) ─── */
    const filtradas = postulaciones.filter(p => {
        const q = busqueda.toLowerCase();
        const matchTexto = !q
            || (p.ci             || '').toLowerCase().includes(q)
            || (p.nombres        || '').toLowerCase().includes(q)
            || (p.apellidos      || '').toLowerCase().includes(q)
            || (p.carrera_asignada || '').toLowerCase().includes(q);
        const matchEstado = filtroEstado === 'todos' || p.estado_admision === filtroEstado;
        return matchTexto && matchEstado;
    });

    /* ─── Export using the active filter ─── */
    const exportarCSVPostulaciones = () => {
        const datos = filtradas;
        const headers = ['CI', 'Nombres', 'Apellidos', 'Carrera Asignada', 'Gestion', 'Estado Admision'];
        const filas = datos.map(p => [
            p.ci || '',
            p.nombres || '',
            p.apellidos || '',
            p.carrera_asignada || p.carrera_opcion1 || '',
            p.gestion || '',
            p.estado_admision || '',
        ]);
        const csvContent = '﻿'
            + headers.join(',') + '\n'
            + filas.map(f => f.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
        const nombreArchivo = 'postulaciones_' + filtroEstado.toLowerCase() + '.csv';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = nombreArchivo; link.click();
        URL.revokeObjectURL(url);
    };

    const exportarPDFPostulaciones = () => {
        const datos = filtradas;
        const doc = new jsPDF();
        const filtroActivo = filtroEstado === 'todos' ? 'Todas' : filtroEstado;
        const titulo = 'CUP-FICCT - Postulaciones: ' + filtroActivo;
        doc.setFontSize(14); doc.setTextColor(26, 58, 107);
        doc.text(titulo, 14, 15);
        doc.setFontSize(9); doc.setTextColor(100, 116, 139);
        doc.text('Generado: ' + new Date().toLocaleDateString('es-BO'), 14, 22);
        doc.text('Total registros: ' + datos.length, 14, 28);
        autoTable(doc, {
            startY: 35,
            head: [['CI', 'Nombres', 'Apellidos', 'Carrera', 'Gestión', 'Estado']],
            body: datos.map(p => [
                p.ci || '',
                p.nombres || '',
                p.apellidos || '',
                p.carrera_asignada || p.carrera_opcion1 || '',
                p.gestion || '',
                p.estado_admision || '',
            ]),
            headStyles: { fillColor: [26, 58, 107], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { fontSize: 8 },
            columnStyles: { 5: { fontStyle: 'bold' } },
        });
        doc.save('postulaciones_' + filtroEstado.toLowerCase() + '.pdf');
    };

    /* ─── Filter button config ─── */
    const contadores = ESTADOS.reduce((acc, e) => {
        acc[e] = postulaciones.filter(p => p.estado_admision === e).length;
        return acc;
    }, {});

    const filterBtns = [
        { key: 'todos',          label: `Todos (${postulaciones.length})`,                        color: '#475569' },
        { key: 'EN PROCESO',     label: `En Proceso (${contadores['EN PROCESO'] ?? 0})`,          color: '#1d4ed8' },
        { key: 'APROBADO',       label: `Aprobado (${contadores['APROBADO'] ?? 0})`,              color: '#15803d' },
        { key: 'REPROBADO',      label: `Reprobado (${contadores['REPROBADO'] ?? 0})`,            color: '#dc2626' },
        { key: 'PENDIENTE_PAGO', label: `Pago Pendiente (${contadores['PENDIENTE_PAGO'] ?? 0})`, color: '#b45309' },
    ];

    const thStyle = { backgroundColor: '#1a3a6b', color: '#ffffff', padding: '12px 16px', fontWeight: '600', fontSize: '13px', letterSpacing: '0.5px', borderBottom: '2px solid #2563eb', whiteSpace: 'nowrap' };
    const btnExport = { border: 'none', borderRadius: 7, padding: '0.25rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

            {/* ── Navbar ── */}
            <nav style={{ background: 'linear-gradient(135deg,#1a3a6b 0%,#2563eb 100%)', padding: '0 1.5rem', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(26,58,107,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>📋</span>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>CUP - FICCT — Postulaciones</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>Sistema de Admisión Universitaria</div>
                    </div>
                </div>
                <button onClick={onBack} style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.45)', color: '#fff', borderRadius: 7, padding: '0.35rem 1rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                    ← Volver al Dashboard
                </button>
            </nav>

            <div className="container-fluid" style={{ padding: '1.75rem 2rem' }}>
                <h5 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '1.25rem' }}>Gestión de Postulaciones</h5>

                {/* ── Stats ── */}
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total',          val: postulaciones.length,              grad: 'linear-gradient(135deg,#1a3a6b,#2563eb)', icon: '📋' },
                        { label: 'En Proceso',     val: contadores['EN PROCESO']    ?? 0,  grad: 'linear-gradient(135deg,#0891b2,#06b6d4)', icon: '⏳' },
                        { label: 'Aprobados',      val: contadores['APROBADO']      ?? 0,  grad: 'linear-gradient(135deg,#059669,#10b981)', icon: '✅' },
                        { label: 'Reprobados',     val: contadores['REPROBADO']     ?? 0,  grad: 'linear-gradient(135deg,#dc2626,#ef4444)', icon: '❌' },
                        { label: 'Pago Pendiente', val: contadores['PENDIENTE_PAGO'] ?? 0, grad: 'linear-gradient(135deg,#d97706,#f59e0b)', icon: '💳' },
                    ].map(({ label, val, grad, icon }) => (
                        <div className="col" key={label}>
                            <div style={{ background: grad, borderRadius: 12, padding: '1rem 1.25rem', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '2rem', opacity: 0.2 }}>{icon}</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.9 }}>{label}</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, marginTop: '0.2rem' }}>{val}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {mensaje && <div className="alert alert-success py-2 small mb-3" style={{ borderRadius: 8 }}>{mensaje}</div>}
                {error   && <div className="alert alert-danger  py-2 small mb-3" style={{ borderRadius: 8 }}>{error}</div>}

                {/* ── Table card ── */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

                    {/* Search + filter + export bar */}
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e8edf5', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>

                        {/* Search input */}
                        <div style={{ position: 'relative', minWidth: 240 }}>
                            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
                            <input
                                type="text"
                                className="form-control"
                                style={{ paddingLeft: '2.2rem', borderRadius: 8, borderColor: '#e2e8f0', fontSize: '0.88rem', height: 38 }}
                                placeholder="Buscar por CI, nombre o carrera..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                            />
                        </div>

                        {/* Filter pills + CSV/PDF buttons in the same row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                            {filterBtns.map(({ key, label, color }) => (
                                <button
                                    key={key}
                                    onClick={() => setFiltroEstado(key)}
                                    style={{
                                        background: filtroEstado === key ? color : 'transparent',
                                        color: filtroEstado === key ? '#fff' : color,
                                        border: `1.5px solid ${color}`,
                                        borderRadius: 20,
                                        padding: '0.25rem 0.75rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {label}
                                </button>
                            ))}

                            {/* Divider */}
                            <span style={{ width: 1, height: 22, background: '#e2e8f0', margin: '0 0.25rem' }} />

                            {/* Export buttons */}
                            <button
                                onClick={exportarCSVPostulaciones}
                                disabled={filtradas.length === 0}
                                style={{ ...btnExport, background: '#16a34a', color: '#fff', opacity: filtradas.length === 0 ? 0.55 : 1, cursor: filtradas.length === 0 ? 'not-allowed' : 'pointer' }}
                                title={`Exportar CSV (${filtradas.length} registros del filtro activo)`}
                            >
                                ⬇ CSV
                            </button>
                            <button
                                onClick={exportarPDFPostulaciones}
                                disabled={filtradas.length === 0}
                                style={{ ...btnExport, background: '#dc2626', color: '#fff', opacity: filtradas.length === 0 ? 0.55 : 1, cursor: filtradas.length === 0 ? 'not-allowed' : 'pointer' }}
                                title={`Exportar PDF (${filtradas.length} registros del filtro activo)`}
                            >
                                ⬇ PDF
                            </button>
                        </div>

                        {/* Row count */}
                        <span style={{ color: '#94a3b8', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            Mostrando <strong style={{ color: '#1e293b' }}>{filtradas.length}</strong> de {postulaciones.length}
                        </span>
                    </div>

                    {loading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr style={{ background: '#1a3a6b' }}>
                                        {['#','CI','Nombres','Apellidos','Carrera Asignada','Gestión','Estado','Cambiar Estado'].map(h => (
                                            <th key={h} style={thStyle}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtradas.length === 0 ? (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No hay postulaciones que coincidan con los filtros.</td></tr>
                                    ) : filtradas.map((p, i) => (
                                        <TR key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                            <td style={{ padding: '0.7rem 1rem', color: '#94a3b8', fontSize: '0.82rem' }}>{i + 1}</td>
                                            <td style={{ padding: '0.7rem 1rem', fontWeight: 600, color: '#1e293b' }}>{p.ci}</td>
                                            <td style={{ padding: '0.7rem 1rem' }}>{p.nombres}</td>
                                            <td style={{ padding: '0.7rem 1rem' }}>{p.apellidos}</td>
                                            <td style={{ padding: '0.7rem 1rem', color: '#64748b', fontSize: '0.88rem' }}>{p.carrera_asignada ?? '—'}</td>
                                            <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>
                                                <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}>{p.gestion}</span>
                                            </td>
                                            <td style={{ padding: '0.7rem 1rem' }}><EstadoBadge estado={p.estado_admision} /></td>
                                            <td style={{ padding: '0.7rem 1rem' }}>
                                                <select
                                                    className="form-select form-select-sm"
                                                    style={{ minWidth: 140, borderRadius: 7, borderColor: '#e2e8f0', fontSize: '0.82rem' }}
                                                    value={p.estado_admision}
                                                    disabled={actualizando === p.id}
                                                    onChange={e => cambiarEstado(p.id, e.target.value)}
                                                >
                                                    {ESTADOS.map(e => (
                                                        <option key={e} value={e}>{e}</option>
                                                    ))}
                                                </select>
                                            </td>
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
