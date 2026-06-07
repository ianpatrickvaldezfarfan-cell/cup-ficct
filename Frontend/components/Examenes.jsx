import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MATERIAS_FB = ['Computacion', 'Matematicas', 'Ingles', 'Fisica'];

function TR({ children, style, ...rest }) {
    const [hov, setHov] = useState(false);
    return (
        <tr {...rest} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ ...style, background: hov ? '#eff6ff' : (style?.background ?? 'transparent'), transition: 'background 0.12s' }}>
            {children}
        </tr>
    );
}

function EstadoBadge({ estado }) {
    const cfg = {
        APROBADO:  { bg: '#dcfce7', color: '#15803d' },
        REPROBADO: { bg: '#fee2e2', color: '#dc2626' },
    };
    const { bg, color } = cfg[estado] ?? { bg: '#f1f5f9', color: '#475569' };
    return <span style={{ background: bg, color, borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.73rem', fontWeight: 700 }}>{estado}</span>;
}

function NotaRow({ nota, onEditar }) {
    const aprobado = nota.estado_materia === 'APROBADO';
    const [hov, setHov] = useState(false);
    return (
        <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ background: hov ? '#eff6ff' : 'transparent', transition: 'background 0.12s' }}>
            <td style={{ padding: '0.7rem 1rem' }}>{nota.materia}</td>
            <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>{nota.nota1 ?? '—'}</td>
            <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>{nota.nota2 ?? '—'}</td>
            <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>{nota.nota3 ?? '—'}</td>
            <td style={{ padding: '0.7rem 1rem', textAlign: 'center', fontWeight: 700 }}>{nota.nota_final ?? '—'}</td>
            <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}><EstadoBadge estado={nota.estado_materia} /></td>
            <td style={{ padding: '0.7rem 1rem' }}>
                <button onClick={() => onEditar(nota)} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    ✏️ Editar
                </button>
            </td>
        </tr>
    );
}

function FilaMateriaVacia({ materia, postulacionId, materiaId, onRegistrar }) {
    const [hov, setHov] = useState(false);
    return (
        <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ background: hov ? '#eff6ff' : '#f8fafc', transition: 'background 0.12s' }}>
            <td style={{ padding: '0.7rem 1rem', color: '#64748b' }}>{materia}</td>
            <td colSpan={5} style={{ padding: '0.7rem 1rem', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>Sin notas registradas</td>
            <td style={{ padding: '0.7rem 1rem' }}>
                <button onClick={() => onRegistrar(materia, postulacionId, materiaId)} style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    + Registrar
                </button>
            </td>
        </tr>
    );
}

export default function Examenes({ onBack }) {
    const [materias, setMaterias] = useState([]);
    const [stats, setStats] = useState({ total_postulantes: '-', con_notas_completas: '-', aprobados: '-', reprobados: '-' });
    const [recientes, setRecientes] = useState([]);

    const [ci, setCi] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [noEncontrado, setNoEncontrado] = useState(false);
    const [error, setError] = useState('');

    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ nota1: '', nota2: '', nota3: '' });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        fetch('/api/materias').then(r => r.ok ? r.json() : []).then(data => setMaterias(data.length ? data : MATERIAS_FB.map((n, i) => ({ id: i + 1, nombre: n })))).catch(() => setMaterias(MATERIAS_FB.map((n, i) => ({ id: i + 1, nombre: n }))));
        fetch('/api/examenes/estadisticas').then(r => r.ok ? r.json() : null).then(d => { if (d) setStats(d); }).catch(() => {});
        fetch('/api/examenes/recientes').then(r => r.ok ? r.json() : []).then(d => setRecientes(d)).catch(() => {});
    }, []);

    const recargarStats = () => {
        fetch('/api/examenes/estadisticas').then(r => r.ok ? r.json() : null).then(d => { if (d) setStats(d); }).catch(() => {});
        fetch('/api/examenes/recientes').then(r => r.ok ? r.json() : []).then(d => setRecientes(d)).catch(() => {});
    };

    async function buscar() {
        const ciTrim = ci.trim();
        if (!ciTrim) return;
        setBuscando(true); setResultado(null); setNoEncontrado(false); setError('');
        try {
            const res = await fetch(`/api/examenes/postulante/${encodeURIComponent(ciTrim)}`);
            if (res.status === 404) { setNoEncontrado(true); return; }
            if (!res.ok) { setError('Error al buscar el postulante.'); return; }
            const data = await res.json();
            const notasMap = {};
            for (const nota of data.notas) notasMap[nota.materia] = nota;
            setResultado({ postulacion_id: data.postulacion_id, ci: data.postulante.ci, nombres: data.postulante.nombres, apellidos: data.postulante.apellidos, notas: notasMap });
        } catch { setError('Error de conexión.'); }
        finally { setBuscando(false); }
    }

    const handleKeyDown = e => { if (e.key === 'Enter') buscar(); };

    function abrirRegistrar(materia, postulacionId, materiaId) {
        setForm({ nota1: '', nota2: '', nota3: '' }); setFormError('');
        setModal({ modo: 'crear', materia, postulacionId, materiaId });
    }

    function abrirEditar(nota) {
        setForm({ nota1: nota.nota1, nota2: nota.nota2, nota3: nota.nota3 }); setFormError('');
        setModal({ modo: 'editar', notaId: nota.id, materia: nota.materia });
    }

    async function guardar() {
        const { nota1, nota2, nota3 } = form;
        if ([nota1, nota2, nota3].some(v => v === '' || isNaN(Number(v)) || Number(v) < 0 || Number(v) > 100)) {
            setFormError('Cada nota debe ser un número entre 0 y 100.'); return;
        }
        setSaving(true); setFormError('');
        try {
            const res = modal.modo === 'crear'
                ? await fetch('/api/examenes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ postulacion_id: modal.postulacionId, materia_id: modal.materiaId, nota1: Number(nota1), nota2: Number(nota2), nota3: Number(nota3) }) })
                : await fetch(`/api/examenes/${modal.notaId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ nota1: Number(nota1), nota2: Number(nota2), nota3: Number(nota3) }) });
            const data = await res.json();
            if (!res.ok) { setFormError(data.message || 'Error al guardar.'); return; }
            setModal(null); setFormError(''); buscar(); recargarStats();
        } catch { setFormError('Error de conexión.'); }
        finally { setSaving(false); }
    }

    const exportarCSV = () => {
        if (!resultado) return;
        const cabecera = ['Materia','Nota 1','Nota 2','Nota 3','Promedio','Estado'];
        const filas = materias.map(mat => {
            const nota = resultado.notas[mat.nombre];
            return [mat.nombre, nota?.nota1 ?? '-', nota?.nota2 ?? '-', nota?.nota3 ?? '-', nota?.nota_final != null ? Number(nota.nota_final).toFixed(2) : '-', nota?.estado_materia ?? '-'];
        });
        if (promedio !== null) filas.push(['PROMEDIO FINAL GLOBAL', '', '', '', promedio.toFixed(2), estadoFinal]);
        const csv = [cabecera, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const nombre = `notas_${resultado.ci}_${resultado.nombres}_${resultado.apellidos}`.replace(/\s+/g, '_');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })); a.download = `${nombre}.csv`; a.click();
        URL.revokeObjectURL(a.href);
    };

    const exportarPDF = () => {
        if (!resultado) return;
        const doc = new jsPDF();
        const fecha = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.setFontSize(16); doc.setTextColor(26, 58, 107); doc.text('CUP-FICCT - Reporte de Notas', 14, 18);
        doc.setFontSize(11); doc.setTextColor(40); doc.text(`Postulante: ${resultado.nombres} ${resultado.apellidos}  —  CI: ${resultado.ci}`, 14, 27);
        doc.setFontSize(9); doc.setTextColor(100); doc.text(`Generado: ${fecha}`, 14, 34);
        const COLOR_AP = [212,237,218]; const COLOR_REP = [248,215,218]; const COLOR_VACIO = [255,255,255];
        const bodyRows = materias.map(mat => {
            const nota = resultado.notas[mat.nombre];
            const color = nota?.estado_materia === 'APROBADO' ? COLOR_AP : nota?.estado_materia === 'REPROBADO' ? COLOR_REP : COLOR_VACIO;
            const c = v => ({ content: v, styles: { fillColor: color } });
            return [c(mat.nombre), c(nota?.nota1 ?? '-'), c(nota?.nota2 ?? '-'), c(nota?.nota3 ?? '-'), { content: nota?.nota_final != null ? Number(nota.nota_final).toFixed(2) : '-', styles: { fillColor: color, fontStyle: 'bold' } }, c(nota?.estado_materia ?? '-')];
        });
        if (promedio !== null) {
            const colorRes = estadoFinal === 'APROBADO' ? COLOR_AP : estadoFinal === 'REPROBADO' ? COLOR_REP : [255,243,205];
            const r = (v, bold = false) => ({ content: v, styles: { fillColor: colorRes, fontStyle: bold ? 'bold' : 'normal' } });
            bodyRows.push([r('PROMEDIO FINAL GLOBAL', true), r('—'), r('—'), r('—'), r(promedio.toFixed(2), true), r(estadoFinal, true)]);
        }
        autoTable(doc, { startY: 40, head: [['Materia','Nota 1','Nota 2','Nota 3','Promedio','Estado']], body: bodyRows, headStyles: { fillColor: [26,58,107], fontSize: 9, fontStyle: 'bold' }, bodyStyles: { fontSize: 9 } });
        const nombre = `notas_${resultado.ci}_${resultado.nombres}_${resultado.apellidos}`.replace(/\s+/g, '_');
        doc.save(`${nombre}.pdf`);
    };

    const conNotas = resultado ? materias.filter(m => resultado.notas[m.nombre]) : [];
    const promedio = conNotas.length > 0 ? conNotas.reduce((s, m) => s + Number(resultado.notas[m.nombre].nota_final || 0), 0) / conNotas.length : null;
    const tieneTodasMaterias = resultado ? conNotas.length === materias.length : false;
    const materiasReprobadas = conNotas.filter(m => Number(resultado?.notas[m.nombre].nota_final) < 60);
    const algunaReprobada = materiasReprobadas.length > 0;
    const estadoFinal = tieneTodasMaterias ? (!algunaReprobada && promedio >= 60 ? 'APROBADO' : 'REPROBADO') : 'EN PROCESO';

    const thStyle = { backgroundColor: '#1a3a6b', color: '#ffffff', padding: '12px 16px', fontWeight: '600', fontSize: '13px', letterSpacing: '0.5px', borderBottom: '2px solid #2563eb', whiteSpace: 'nowrap' };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

            {/* ── Navbar ── */}
            <nav style={{ background: 'linear-gradient(135deg,#1a3a6b 0%,#2563eb 100%)', padding: '0 1.5rem', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(26,58,107,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>📝</span>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>CUP - FICCT — Exámenes</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>Sistema de Admisión Universitaria</div>
                    </div>
                </div>
                <button onClick={onBack} style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.45)', color: '#fff', borderRadius: 7, padding: '0.35rem 1rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                    ← Volver al Dashboard
                </button>
            </nav>

            <div className="container-fluid" style={{ padding: '1.75rem 2rem' }}>
                <h5 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '1.25rem' }}>Registro de Notas por Examen</h5>

                {/* ── Stats ── */}
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total Postulantes',  val: stats.total_postulantes,   grad: 'linear-gradient(135deg,#1a3a6b,#2563eb)', icon: '👥', sub: `Gestión ${new Date().getFullYear()}` },
                        { label: 'Notas Completas',    val: stats.con_notas_completas, grad: 'linear-gradient(135deg,#0891b2,#06b6d4)', icon: '📋', sub: 'Con las 4 materias' },
                        { label: 'Aprobados',          val: stats.aprobados,           grad: 'linear-gradient(135deg,#15803d,#16a34a)', icon: '✅', sub: 'Estado APROBADO' },
                        { label: 'Reprobados',         val: stats.reprobados,          grad: 'linear-gradient(135deg,#dc2626,#ef4444)', icon: '❌', sub: 'Estado REPROBADO' },
                    ].map(({ label, val, grad, icon, sub }) => (
                        <div className="col-md-3" key={label}>
                            <div style={{ background: grad, borderRadius: 14, padding: '1.25rem 1.5rem', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '2.6rem', opacity: 0.2 }}>{icon}</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.9 }}>{label}</div>
                                <div style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.1, marginTop: '0.25rem' }}>{val}</div>
                                <div style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: '0.15rem' }}>{sub}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Recent notes table ── */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ background: '#1e293b', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1rem' }}>🕐</span>
                        <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Últimas notas registradas</strong>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-sm mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr style={{ background: '#1a3a6b' }}>
                                    {['CI','Nombres','Apellidos','Materia','Promedio','Estado'].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {recientes.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.88rem' }}>No hay notas registradas aún.</td></tr>
                                ) : recientes.map((r, i) => (
                                    <TR key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>{r.ci}</td>
                                        <td style={{ padding: '0.65rem 1rem' }}>{r.nombres}</td>
                                        <td style={{ padding: '0.65rem 1rem' }}>{r.apellidos}</td>
                                        <td style={{ padding: '0.65rem 1rem' }}>{r.materia}</td>
                                        <td style={{ padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 600 }}>{r.nota_final != null ? Number(r.nota_final).toFixed(2) : '—'}</td>
                                        <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}><EstadoBadge estado={r.estado_materia} /></td>
                                    </TR>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Search ── */}
                <h5 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '1rem' }}>Buscar y registrar notas de un postulante</h5>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8edf5', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '0.5rem' }}>
                        Buscar postulante por CI
                    </label>
                    <div className="input-group input-group-lg">
                        <input
                            type="text"
                            className="form-control"
                            style={{ borderRadius: '8px 0 0 8px', borderColor: '#e2e8f0', fontSize: '0.95rem' }}
                            placeholder="Ingrese el CI del postulante..."
                            value={ci}
                            onChange={e => { setCi(e.target.value); setResultado(null); setNoEncontrado(false); setError(''); }}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        {ci && (
                            <button className="btn" style={{ borderColor: '#e2e8f0', background: '#f8fafc' }} onClick={() => { setCi(''); setResultado(null); setNoEncontrado(false); setError(''); }}>✕</button>
                        )}
                        <button className="btn" style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', color: '#fff', border: 'none', borderRadius: '0 8px 8px 0', padding: '0 1.5rem', fontWeight: 600 }} onClick={buscar} disabled={buscando || !ci.trim()}>
                            {buscando ? <><span className="spinner-border spinner-border-sm me-2" />Buscando...</> : 'Buscar'}
                        </button>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                        Ingrese el CI exacto y presione <kbd>Enter</kbd> o haga clic en Buscar.
                    </div>
                </div>

                {error && <div className="alert alert-danger py-2 small mb-3" style={{ borderRadius: 8 }}>{error}</div>}
                {noEncontrado && (
                    <div className="alert alert-warning py-2 small mb-3" style={{ borderRadius: 8 }}>
                        No se encontró ningún postulante con CI <strong>{ci}</strong>.
                    </div>
                )}
                {!resultado && !noEncontrado && !error && !buscando && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔍</div>
                        <p style={{ margin: 0 }}>Ingrese el CI del postulante para ver y registrar sus notas.</p>
                    </div>
                )}

                {/* Export buttons for result */}
                {resultado && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <button onClick={exportarCSV} disabled={conNotas.length === 0} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>⬇ Exportar CSV</button>
                        <button onClick={exportarPDF} disabled={conNotas.length === 0} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>⬇ Exportar PDF</button>
                    </div>
                )}

                {/* Result table */}
                {resultado && (
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{resultado.apellidos} {resultado.nombres}</strong>
                                <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '0.18rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, marginLeft: 8 }}>CI: {resultado.ci}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {promedio !== null && <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>Promedio global: <strong style={{ color: '#fff' }}>{promedio.toFixed(2)}</strong></span>}
                                <EstadoBadge estado={estadoFinal} />
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="table mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr style={{ background: '#1a3a6b' }}>
                                        {['Materia','Nota 1','Nota 2','Nota 3','Promedio','Estado','Acción'].map(h => (
                                            <th key={h} style={{ ...thStyle, textAlign: h !== 'Materia' && h !== 'Acción' ? 'center' : 'left' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {materias.map((mat, i) => {
                                        const nota = resultado.notas[mat.nombre];
                                        return nota ? (
                                            <NotaRow key={mat.id} nota={nota} onEditar={abrirEditar} />
                                        ) : (
                                            <FilaMateriaVacia key={mat.id} materia={mat.nombre} postulacionId={resultado.postulacion_id} materiaId={mat.id} onRegistrar={abrirRegistrar} />
                                        );
                                    })}
                                    {promedio !== null && (
                                        <tr style={{ background: estadoFinal === 'APROBADO' ? '#f0fdf4' : estadoFinal === 'REPROBADO' ? '#fef2f2' : '#fefce8', fontWeight: 700 }}>
                                            <td style={{ padding: '0.75rem 1rem', color: '#1e293b' }}>
                                                PROMEDIO FINAL GLOBAL
                                                {!tieneTodasMaterias && <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.8rem', marginLeft: 6 }}>({conNotas.length}/{materias.length} materias)</span>}
                                                {tieneTodasMaterias && algunaReprobada && <div style={{ fontWeight: 400, color: '#dc2626', fontSize: '0.78rem', marginTop: 2 }}>Reprobó: {materiasReprobadas.map(m => m.nombre).join(', ')}</div>}
                                                {tieneTodasMaterias && !algunaReprobada && promedio < 60 && <div style={{ fontWeight: 400, color: '#dc2626', fontSize: '0.78rem', marginTop: 2 }}>Promedio global insuficiente</div>}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>—</td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>—</td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>—</td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '1.05rem' }}>{promedio.toFixed(2)}</td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}><EstadoBadge estado={estadoFinal} /></td>
                                            <td style={{ padding: '0.75rem 1rem' }}></td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal ── */}
            {modal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem' }}>
                    <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h5 style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: '1rem' }}>
                                {modal.modo === 'crear' ? '➕ Registrar' : '✏️ Editar'} Notas — {modal.materia}
                            </h5>
                            <button onClick={() => { setModal(null); setFormError(''); }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            {formError && <div className="alert alert-danger py-2 small mb-3" style={{ borderRadius: 8 }}>{formError}</div>}
                            <p style={{ color: '#64748b', fontSize: '0.83rem', marginBottom: '1rem' }}>
                                Cada nota entre 0 y 100. Promedio = (nota1 + nota2 + nota3) / 3. Se aprueba con promedio ≥ 60.
                            </p>
                            {['nota1', 'nota2', 'nota3'].map((campo, i) => (
                                <div style={{ marginBottom: '1rem' }} key={campo}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '0.3rem' }}>
                                        Nota {i + 1}
                                    </label>
                                    <input type="number" name={campo} className="form-control" style={{ borderRadius: 8, borderColor: '#e2e8f0', height: 40 }} min="0" max="100" step="0.01" value={form[campo]} onChange={e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))} placeholder="0 - 100" />
                                </div>
                            ))}
                            {form.nota1 !== '' && form.nota2 !== '' && form.nota3 !== '' && (() => {
                                const prom = (Number(form.nota1) + Number(form.nota2) + Number(form.nota3)) / 3;
                                return (
                                    <div style={{ background: prom >= 60 ? '#f0fdf4' : '#fef2f2', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#475569', fontSize: '0.88rem' }}>Promedio calculado: <strong>{prom.toFixed(2)}</strong></span>
                                        <EstadoBadge estado={prom >= 60 ? 'APROBADO' : 'REPROBADO'} />
                                    </div>
                                );
                            })()}
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button style={{ background: 'transparent', border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: 8, padding: '0.5rem 1.25rem', cursor: 'pointer', flex: 1 }} onClick={() => { setModal(null); setFormError(''); }}>
                                    Cancelar
                                </button>
                                <button style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', flex: 1, boxShadow: '0 3px 10px rgba(37,99,235,0.35)' }} onClick={guardar} disabled={saving}>
                                    {saving ? 'Guardando...' : '💾 Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
