import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FORM_VACIO = {
    ci: '', nombres: '', apellidos: '', correo: '',
    profesion: '', tiene_maestria: false, tiene_diplomado: false,
};

function detectarMateriaKey(profesion) {
    if (!profesion) return null;
    const p = profesion.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const kw = {
        computacion: ['computacion','sistemas','informatica','software','programacion','tecnologia','redes','telecomunicaciones','electronica','robotica','ciberseguridad','datos','inteligencia','artificial','developer','desarrollo','web','movil'],
        matematicas:  ['matematica','estadistica','calculo','algebra','actuaria','contabilidad','economia','finanzas','ingenieria','industrial','civil','arquitectura'],
        ingles:       ['ingles','idiomas','linguistica','filologia','letras','comunicacion','traduccion','bilingue','english','literatura','humanidades'],
        fisica:       ['fisica','quimica','ciencias','laboratorio','investigacion','astrofisica','mecanica','electromecanica','biologia','ambiental'],
    };
    for (const [key, words] of Object.entries(kw)) {
        if (words.some(w => p.includes(w))) return key;
    }
    return null;
}

function MateriaBadge({ profesion }) {
    const key = detectarMateriaKey(profesion);
    const cfg = {
        computacion: { icon: '🖥️', label: 'Computación', bg: '#dbeafe', color: '#1d4ed8' },
        matematicas:  { icon: '📐', label: 'Matemáticas',  bg: '#dcfce7', color: '#15803d' },
        ingles:       { icon: '🌍', label: 'Inglés',        bg: '#ede9fe', color: '#7c3aed' },
        fisica:       { icon: '🔬', label: 'Física',        bg: '#ffedd5', color: '#c2410c' },
    };
    if (!key) return <span style={{ background: '#f1f5f9', color: '#94a3b8', borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.73rem' }}>❓ Sin detectar</span>;
    const c = cfg[key];
    return <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.73rem', fontWeight: 700 }}>{c.icon} {c.label}</span>;
}

function TurnoBadge({ turno }) {
    if (!turno) return <span style={{ color: '#94a3b8' }}>—</span>;
    if (turno === 'Manana') return <span style={{ background: '#fef9c3', color: '#b45309', borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.73rem', fontWeight: 700 }}>🌅 Mañana</span>;
    if (turno === 'Tarde')  return <span style={{ background: '#ffedd5', color: '#c2410c', borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.73rem', fontWeight: 700 }}>🌇 Tarde</span>;
    return <span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.73rem', fontWeight: 700 }}>🌙 Noche</span>;
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

/**
 * CU8 - GESTIONAR DOCENTES
 * CU11 - GESTIONAR ASIGNACIONES DE DOCENTES
 * Mensaje 1: enviarDatosDocente() → handleSubmit()
 * Mensaje 1.1: procesarFormulario() → POST /api/docentes
 * Mensaje 1.10: guardarAsignacion() → asignarAutomatico()
 * Mensaje 1.12: mostrarCargaHoraria() → modal asignaciones
 */
function Docentes({ user, onBack }) {
    const [docentes, setDocentes] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(FORM_VACIO);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [stats, setStats] = useState({ total: '-', con_maestria: '-', con_diplomado: '-', con_ambos: '-' });
    const [asignaciones, setAsignaciones] = useState([]);
    const [modalAsig, setModalAsig]         = useState(null);
    const [asignando, setAsignando]         = useState(false);
    const [modalConfirm, setModalConfirm]   = useState(false);

    useEffect(() => {
        cargarDocentes();
        fetch('/api/docentes/estadisticas').then(r => r.ok ? r.json() : null).then(d => { if (d) setStats(d); }).catch(() => {});
        fetch('/api/docentes/asignaciones').then(r => r.ok ? r.json() : []).then(d => setAsignaciones(d)).catch(() => {});
    }, []);

    const cargarDocentes = async () => {
        const res = await fetch('/api/docentes');
        setDocentes(await res.json());
    };

    const verAsignaciones = async (docente) => {
        setModalAsig({ docente, items: [], cargando: true });
        try {
            const res = await fetch(`/api/docentes/${docente.id}/asignaciones`);
            setModalAsig({ docente, items: await res.json(), cargando: false });
        } catch {
            setModalAsig({ docente, items: [], cargando: false });
        }
    };

    const asignarAutomatico = async () => {
        setAsignando(true);
        setModalConfirm(false);
        try {
            const res = await fetch('/api/docentes/asignar-automatico', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-Id': user?.id ?? '' },
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ ' + data.mensaje + '\nTotal asignaciones: ' + data.total_asignaciones);
                cargarDocentes();
                fetch('/api/docentes/asignaciones').then(r => r.ok ? r.json() : []).then(d => setAsignaciones(d)).catch(() => {});
            } else {
                alert('❌ Error: ' + data.mensaje);
            }
        } catch {
            alert('❌ Error de conexión');
        } finally {
            setAsignando(false);
        }
    };

    const buscar = async (e) => {
        setBusqueda(e.target.value);
        if (!e.target.value.trim()) { cargarDocentes(); return; }
        const res = await fetch(`/api/docentes/search?q=${encodeURIComponent(e.target.value)}`);
        setDocentes(await res.json());
    };

    const handleChange = e => {
        const { name, type, checked, value } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setExito('');
        const url = editando ? `/api/docentes/${editando}` : '/api/docentes';
        const method = editando ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(form) });
        const data = await res.json();
        if (res.ok) {
            setExito(editando ? 'Docente actualizado correctamente.' : 'Docente registrado correctamente.');
            cerrarForm(); cargarDocentes();
        } else {
            setError(data.errors ? Object.values(data.errors).flat().join(' | ') : data.message || 'Error al guardar.');
        }
    };

    const editar = (d) => {
        setEditando(d.id);
        setForm({ ci: d.ci || '', nombres: d.nombres || '', apellidos: d.apellidos || '', correo: d.correo || '', profesion: d.profesion || '', tiene_maestria: !!d.tiene_maestria, tiene_diplomado: !!d.tiene_diplomado });
        setMostrarForm(true); setError(''); setExito('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const eliminar = async (id) => {
        if (!confirm('¿Eliminar este docente? También se eliminará su cuenta de usuario.')) return;
        const res = await fetch(`/api/docentes/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) { setExito(data.message); cargarDocentes(); }
        else setError(data.message || 'Error al eliminar.');
    };

    const cerrarForm = () => { setMostrarForm(false); setEditando(null); setForm(FORM_VACIO); setError(''); };
    const abrirNuevo = () => { cerrarForm(); setMostrarForm(true); };

    const exportarCSV = () => {
        const cabecera = ['CI','Nombres','Apellidos','Profesion','Maestria','Diplomado','Correo'];
        const filas = docentes.map(d => [d.ci, d.nombres, d.apellidos, d.profesion, d.tiene_maestria ? 'Si' : 'No', d.tiene_diplomado ? 'Si' : 'No', d.correo]);
        const csv = [cabecera, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })); a.download = 'docentes.csv'; a.click();
        URL.revokeObjectURL(a.href);
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        const fecha = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.setFontSize(16); doc.setTextColor(26, 58, 107); doc.text('CUP-FICCT - Lista de Docentes', 14, 18);
        doc.setFontSize(10); doc.setTextColor(100); doc.text(`Generado: ${fecha}`, 14, 26); doc.text(`Total: ${docentes.length} docentes`, 14, 32);
        autoTable(doc, {
            startY: 38,
            head: [['CI','Nombres','Apellidos','Profesion','Maestria','Diplomado','Correo']],
            body: docentes.map(d => [d.ci, d.nombres, d.apellidos, d.profesion, d.tiene_maestria ? 'Si' : 'No', d.tiene_diplomado ? 'Si' : 'No', d.correo]),
            headStyles: { fillColor: [26, 58, 107], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [240, 245, 255] },
        });
        doc.save('docentes.pdf');
    };

    const thStyle = { backgroundColor: '#1a3a6b', color: '#ffffff', padding: '12px 16px', fontWeight: '600', fontSize: '13px', letterSpacing: '0.5px', borderBottom: '2px solid #2563eb', whiteSpace: 'nowrap' };
    const tdStyle = { padding: '0.7rem 1rem', fontSize: '0.88rem', verticalAlign: 'middle' };

    const FieldLabel = ({ children, required }) => (
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '0.3rem' }}>
            {children}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
        </label>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

            {/* ── Navbar ── */}
            <nav style={{ background: 'linear-gradient(135deg,#1a3a6b 0%,#2563eb 100%)', padding: '0 1.5rem', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(26,58,107,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>👨‍🏫</span>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>CUP - FICCT — Módulo de Docentes</div>
                        <div className="d-none d-sm-block" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>Sistema de Admisión Universitaria</div>
                    </div>
                </div>
                <button onClick={onBack} style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.45)', color: '#fff', borderRadius: 7, padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                    <span className="d-none d-sm-inline">← Volver al Dashboard</span>
                    <span className="d-sm-none">←</span>
                </button>
            </nav>

            <div className="container-fluid px-3 px-md-4" style={{ paddingTop: '1.75rem', paddingBottom: '1.75rem' }}>

                {/* ── Alerts ── */}
                {error && <div className="alert alert-danger alert-dismissible py-2 small mb-3" style={{ borderRadius: 9 }}>{error}<button type="button" className="btn-close btn-sm" onClick={() => setError('')} /></div>}
                {exito && <div className="alert alert-success alert-dismissible py-2 small mb-3" style={{ borderRadius: 9 }}>{exito}<button type="button" className="btn-close btn-sm" onClick={() => setExito('')} /></div>}

                {/* ── Form ── */}
                {mostrarForm && (
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1rem' }}>{editando ? '✏️' : '➕'}</span>
                                <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
                                    {editando ? 'Editar Docente' : 'Registrar Nuevo Docente'}
                                </span>
                            </div>
                            <button onClick={cerrarForm} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <form onSubmit={handleSubmit}>
                                {/* Datos Personales */}
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '2px solid #eff6ff', paddingBottom: '0.4rem' }}>
                                    👤 Datos Personales
                                </p>
                                <div className="row g-3 mb-3">
                                    {[
                                        { label: 'CI', name: 'ci', col: 'col-md-3', note: !editando ? 'Será el usuario y contraseña inicial.' : '' },
                                        { label: 'Nombres', name: 'nombres', col: 'col-md-3' },
                                        { label: 'Apellidos', name: 'apellidos', col: 'col-md-3' },
                                        { label: 'Correo', name: 'correo', col: 'col-md-3', type: 'email' },
                                    ].map(({ label, name, col, type = 'text', note }) => (
                                        <div className={col} key={name}>
                                            <FieldLabel required>{label}</FieldLabel>
                                            <input type={type} name={name} className="form-control" style={{ borderRadius: 7, borderColor: '#e2e8f0', fontSize: '0.88rem', height: 38 }} value={form[name]} onChange={handleChange} required />
                                            {note && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>{note}</div>}
                                        </div>
                                    ))}
                                </div>

                                {/* Perfil Académico */}
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '2px solid #eff6ff', paddingBottom: '0.4rem' }}>
                                    🎓 Perfil Académico
                                </p>
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-6">
                                        <FieldLabel required>Profesión</FieldLabel>
                                        <input name="profesion" className="form-control" style={{ borderRadius: 7, borderColor: '#e2e8f0', fontSize: '0.88rem', height: 38 }} placeholder="Ej: Ingeniero en Sistemas" value={form.profesion} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-3">
                                        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.85rem 1rem', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input type="checkbox" id="tiene_maestria" name="tiene_maestria" className="form-check-input" style={{ width: 18, height: 18 }} checked={form.tiene_maestria} onChange={handleChange} />
                                                <label htmlFor="tiene_maestria" style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem', cursor: 'pointer', margin: 0 }}>
                                                    🎓 Tiene Maestría
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.85rem 1rem', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input type="checkbox" id="tiene_diplomado" name="tiene_diplomado" className="form-check-input" style={{ width: 18, height: 18 }} checked={form.tiene_diplomado} onChange={handleChange} />
                                                <label htmlFor="tiene_diplomado" style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem', cursor: 'pointer', margin: 0 }}>
                                                    📜 Tiene Diplomado
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex gap-2 mt-3">
                                    <button type="submit" style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(37,99,235,0.35)' }}>
                                        {editando ? '💾 Actualizar' : '✅ Registrar'}
                                    </button>
                                    <button type="button" style={{ background: 'transparent', border: '1.5px solid #94a3b8', color: '#64748b', borderRadius: 8, padding: '0.5rem 1.25rem', cursor: 'pointer' }} onClick={cerrarForm}>
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── Stats ── */}
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total Docentes', val: stats.total,        grad: 'linear-gradient(135deg,#1a3a6b,#2563eb)', icon: '👨‍🏫' },
                        { label: 'Con Maestría',   val: stats.con_maestria,  grad: 'linear-gradient(135deg,#15803d,#16a34a)', icon: '🎓' },
                        { label: 'Con Diplomado',  val: stats.con_diplomado, grad: 'linear-gradient(135deg,#ea580c,#f97316)', icon: '📜' },
                        { label: 'Con Ambos',      val: stats.con_ambos,     grad: 'linear-gradient(135deg,#6d28d9,#7c3aed)', icon: '⭐' },
                    ].map(({ label, val, grad, icon }) => (
                        <div className="col-md-3 col-sm-6" key={label}>
                            <div style={{ background: grad, borderRadius: 14, padding: '1.25rem 1.5rem', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '2.6rem', opacity: 0.2 }}>{icon}</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.9 }}>{label}</div>
                                <div style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.1, marginTop: '0.25rem' }}>{val}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Asignaciones table ── */}
                {asignaciones.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1rem' }}>📋</span>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Asignaciones de Docentes a Grupos</span>
                            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', marginLeft: 4 }}>{asignaciones.length} asignaciones</span>
                        </div>
                        <div className="table-responsive" style={{ maxHeight: 280, overflowY: 'auto' }}>
                            <table className="table table-sm mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead style={{ position: 'sticky', top: 0 }}>
                                    <tr style={{ background: '#1a3a6b' }}>
                                        {['Docente','Materia','Grupo','Aula','Horario','Turno'].map(h => (
                                            <th key={h} style={thStyle}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {asignaciones.map((a, i) => (
                                        <TR key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{a.docente}</td>
                                            <td style={tdStyle}>{a.materia}</td>
                                            <td style={tdStyle}>{a.grupo}</td>
                                            <td style={{ ...tdStyle, color: '#64748b' }}>{a.aula ?? '—'}</td>
                                            <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.82rem' }}>{a.horario_ini ? `${a.horario_ini}–${a.horario_fin}` : '—'}</td>
                                            <td style={tdStyle}><TurnoBadge turno={a.turno} /></td>
                                        </TR>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Action bar ── */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8edf5', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '0.85rem 1.25rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
                            <input
                                className="form-control"
                                style={{ paddingLeft: '2.2rem', borderRadius: 8, borderColor: '#e2e8f0', fontSize: '0.88rem', height: 38 }}
                                placeholder="Buscar por CI, nombre o apellido..."
                                value={busqueda}
                                onChange={buscar}
                            />
                        </div>
                        <span style={{ color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            <strong style={{ color: '#1a3a6b' }}>{docentes.length}</strong> docentes
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={mostrarForm && !editando ? cerrarForm : abrirNuevo}
                            style={{ background: mostrarForm && !editando ? '#64748b' : 'linear-gradient(90deg,#1a3a6b,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            {mostrarForm && !editando ? '✕ Cancelar' : '+ Nuevo Docente'}
                        </button>
                        <button onClick={exportarCSV} disabled={docentes.length === 0} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>⬇ CSV</button>
                        <button onClick={exportarPDF} disabled={docentes.length === 0} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>⬇ PDF</button>
                        <button onClick={() => setModalConfirm(true)} disabled={asignando} style={{ background: '#f59e0b', color: '#1a3a6b', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', cursor: asignando ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
                            {asignando ? '⏳ Asignando...' : '⚡ Asignacion Automatica'}
                        </button>
                    </div>
                </div>

                {/* ── Table ── */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table className="table mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr style={{ background: '#1a3a6b' }}>
                                    {['#','CI','Nombres','Apellidos','Profesión','Materia Detectada','Maestría','Diplomado','Correo','Acciones'].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {docentes.length === 0 ? (
                                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👨‍🏫</div>
                                        No hay docentes registrados
                                    </td></tr>
                                ) : docentes.map((d, i) => (
                                    <TR key={d.id} style={{ background: editando === d.id ? '#fefce8' : i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '0.8rem' }}>{i + 1}</td>
                                        <td style={{ ...tdStyle, fontWeight: 700, color: '#1e293b' }}>{d.ci}</td>
                                        <td style={tdStyle}>{d.nombres}</td>
                                        <td style={tdStyle}>{d.apellidos}</td>
                                        <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.82rem' }}>{d.profesion}</td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}><MateriaBadge profesion={d.profesion} /></td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            {d.tiene_maestria
                                                ? <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.73rem', fontWeight: 700 }}>✓ Sí</span>
                                                : <span style={{ background: '#f1f5f9', color: '#94a3b8', borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.73rem' }}>No</span>
                                            }
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            {d.tiene_diplomado
                                                ? <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.73rem', fontWeight: 700 }}>✓ Sí</span>
                                                : <span style={{ background: '#f1f5f9', color: '#94a3b8', borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.73rem' }}>No</span>
                                            }
                                        </td>
                                        <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.82rem' }}>{d.correo}</td>
                                        <td style={tdStyle}>
                                            <button onClick={() => verAsignaciones(d)} style={{ background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', borderRadius: 6, padding: '0.3rem 0.65rem', cursor: 'pointer', marginRight: 4, fontSize: '0.78rem', fontWeight: 600 }} title="Ver Asignaciones">📋 Asig.</button>
                                            <button onClick={() => editar(d)} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.6rem', cursor: 'pointer', marginRight: 4, fontSize: '0.8rem' }} title="Editar">✏️</button>
                                            <button onClick={() => eliminar(d.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }} title="Eliminar">🗑️</button>
                                        </td>
                                    </TR>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* ── Modal: Asignaciones del docente ── */}
            {modalAsig && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ background: 'linear-gradient(135deg,#1a3a6b,#2563eb)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                                    Asignaciones de {modalAsig.docente.nombres} {modalAsig.docente.apellidos}
                                </div>
                                <div style={{ color: '#bfdbfe', fontSize: 12, marginTop: 2 }}>Grupos y materias asignadas</div>
                            </div>
                            <button onClick={() => setModalAsig(null)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 14 }}>
                                Cerrar
                            </button>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {modalAsig.cargando ? (
                                <div style={{ textAlign: 'center', padding: 48 }}>
                                    <div className="spinner-border" style={{ color: '#1a3a6b' }} role="status" />
                                </div>
                            ) : modalAsig.items.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 56, color: '#94a3b8' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📋</div>
                                    Este docente no tiene grupos asignados aún.
                                </div>
                            ) : (
                                <table className="table mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr>
                                            {['Grupo', 'Materia', 'Aula', 'Horario', 'Turno'].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modalAsig.items.map((a, i) => (
                                            <TR key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                <td style={{ ...tdStyle, fontWeight: 600 }}>{a.grupo}</td>
                                                <td style={tdStyle}>{a.materia}</td>
                                                <td style={{ ...tdStyle, color: '#64748b' }}>{a.aula ?? '—'}</td>
                                                <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.82rem' }}>{a.horario_ini ? `${a.horario_ini}–${a.horario_fin}` : '—'}</td>
                                                <td style={tdStyle}><TurnoBadge turno={a.turno} /></td>
                                            </TR>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Confirmacion Asignacion Automatica ── */}
            {modalConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.8rem', marginBottom: 12 }}>⚡</div>
                        <h5 style={{ color: '#1a3a6b', fontWeight: 700, marginBottom: 10, fontSize: 18 }}>Asignacion Automatica de Docentes</h5>
                        <p style={{ color: '#475569', fontSize: 14, marginBottom: 14 }}>
                            ¿Asignar automaticamente todos los docentes a los grupos disponibles?
                        </p>
                        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 16px', marginBottom: 24, color: '#78350f', fontSize: 13 }}>
                            Esto distribuira los <strong>{stats.total}</strong> docentes entre los grupos existentes respetando el limite de <strong>4 grupos por docente</strong>.
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button onClick={() => setModalConfirm(false)} style={{ border: '1.5px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '9px 26px', cursor: 'pointer', color: '#64748b', fontSize: 14, fontWeight: 500 }}>
                                Cancelar
                            </button>
                            <button onClick={asignarAutomatico} style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', border: 'none', borderRadius: 8, padding: '9px 26px', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Docentes;
