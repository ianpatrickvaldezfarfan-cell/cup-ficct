import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FORM_VACIO = {
    ci: '', nombres: '', apellidos: '', fecha_nac: '', genero: 'M',
    telefono: '', correo: '', direccion: '', colegio_procedencia: '', ciudad: '',
    carrera_opcion1_id: '', carrera_opcion2_id: '',
};

/* ─── Row hover helper ─── */
function TR({ children, style, ...rest }) {
    const [hov, setHov] = useState(false);
    return (
        <tr
            {...rest}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{ ...style, background: hov ? '#eff6ff' : (style?.background ?? 'transparent'), transition: 'background 0.12s' }}
        >
            {children}
        </tr>
    );
}

/**
 * CU3 - GESTIONAR POSTULANTES
 * Diagrama de Secuencia:
 * Mensaje 1: enviarDatosPostulante() → handleSubmit()
 * Mensaje 1.1: procesarFormulario() → POST /api/postulantes
 * Mensaje 1.8 [registrar]: store() → INSERT postulante
 * Mensaje 1.8 [modificar]: update() → PUT /api/postulantes/{id}
 * Mensaje 1.8 [eliminar]: destroy() → DELETE /api/postulantes/{id}
 * Mensaje 1.8 [buscar]: search() → GET /api/postulantes/search
 */
function Postulantes({ onBack, user }) {
    const [postulantes, setPostulantes] = useState([]);
    const [carreras, setCarreras] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(FORM_VACIO);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [stats, setStats] = useState({
        total_postulantes: '-', aprobados: '-', reprobados: '-', en_proceso: '-', ciudades: [],
    });

    useEffect(() => {
        cargarPostulantes();
        fetch('/api/carreras').then(r => r.json()).then(setCarreras).catch(() => {});
        fetch('/api/postulantes/estadisticas')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setStats(d); })
            .catch(() => {});
    }, []);

    const cargarPostulantes = async () => {
        const res = await fetch('/api/postulantes');
        const data = await res.json();
        setPostulantes(data);
    };

    const buscar = async (e) => {
        setBusqueda(e.target.value);
        if (e.target.value.trim() === '') { cargarPostulantes(); return; }
        const res = await fetch(`/api/postulantes/search?q=${e.target.value}`);
        const data = await res.json();
        setPostulantes(data);
    };

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setExito('');
        const url = editando ? `/api/postulantes/${editando}` : '/api/postulantes';
        const method = editando ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-User-Id': user?.id ?? '' },
            body: JSON.stringify(form)
        });
        const data = await res.json();
        if (res.ok) {
            setExito(editando ? 'Postulante actualizado' : 'Postulante registrado');
            setMostrarForm(false);
            setEditando(null);
            setForm(FORM_VACIO);
            cargarPostulantes();
        } else {
            setError(data.message || JSON.stringify(data.errors));
        }
    };

    const editar = (p) => {
        setEditando(p.id);
        setForm({
            ci: p.ci, nombres: p.nombres, apellidos: p.apellidos,
            fecha_nac: p.fecha_nac, genero: p.genero, telefono: p.telefono || '',
            correo: p.correo, direccion: p.direccion || '',
            colegio_procedencia: p.colegio_procedencia || '', ciudad: p.ciudad || ''
        });
        setMostrarForm(true);
        setError(''); setExito('');
    };

    const eliminar = async (id) => {
        if (!confirm('¿Eliminar este postulante?')) return;
        await fetch(`/api/postulantes/${id}`, { method: 'DELETE', headers: { 'X-User-Id': user?.id ?? '' } });
        cargarPostulantes();
    };

    const exportarCSV = () => {
        const cabecera = ['CI','Nombres','Apellidos','Genero','Telefono','Correo','Ciudad','Colegio_Procedencia'];
        const filas = postulantes.map(p => [
            p.ci, p.nombres, p.apellidos,
            p.genero === 'M' ? 'Masculino' : p.genero === 'F' ? 'Femenino' : 'Otro',
            p.telefono || '', p.correo || '', p.ciudad || '', p.colegio_procedencia || '',
        ]);
        const csv = [cabecera, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'postulantes.csv'; a.click();
        URL.revokeObjectURL(a.href);
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        const fecha = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.setFontSize(16); doc.setTextColor(26, 58, 107);
        doc.text('CUP-FICCT - Lista de Postulantes', 14, 18);
        doc.setFontSize(10); doc.setTextColor(100);
        doc.text(`Generado: ${fecha}`, 14, 26);
        doc.text(`Total: ${postulantes.length} postulantes`, 14, 32);
        autoTable(doc, {
            startY: 38,
            head: [['CI','Nombres','Apellidos','Genero','Telefono','Correo','Ciudad']],
            body: postulantes.map(p => [
                p.ci, p.nombres, p.apellidos,
                p.genero === 'M' ? 'Masc.' : p.genero === 'F' ? 'Fem.' : 'Otro',
                p.telefono || '-', p.correo || '-', p.ciudad || '-',
            ]),
            headStyles: { fillColor: [26, 58, 107], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [240, 245, 255] },
        });
        doc.save('postulantes.pdf');
    };

    /* ── field helper for form ── */
    const Field = ({ label, name, type = 'text', required = false, col = 'col-md-4' }) => (
        <div className={col}>
            <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '0.3rem' }}>
                    {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
                </label>
                <input
                    type={type}
                    name={name}
                    className="form-control"
                    style={{ borderRadius: 7, borderColor: '#e2e8f0', fontSize: '0.88rem', height: 38 }}
                    value={form[name]}
                    onChange={handleChange}
                    required={required}
                />
            </div>
        </div>
    );

    const thStyle = { backgroundColor: '#1a3a6b', color: '#ffffff', padding: '12px 16px', fontWeight: '600', fontSize: '13px', letterSpacing: '0.5px', borderBottom: '2px solid #2563eb', whiteSpace: 'nowrap' };
    const tdStyle = { padding: '0.7rem 1rem', fontSize: '0.88rem', verticalAlign: 'middle' };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

            {/* ── Navbar ── */}
            <nav style={{ background: 'linear-gradient(135deg,#1a3a6b 0%,#2563eb 100%)', padding: '0 1.5rem', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(26,58,107,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>👥</span>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>CUP - FICCT — Módulo de Postulantes</div>
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
                                    {editando ? 'Editar Postulante' : 'Registrar Nuevo Postulante'}
                                </span>
                            </div>
                            <button onClick={() => setMostrarForm(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <form onSubmit={handleSubmit}>
                                {/* Datos Personales */}
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '2px solid #eff6ff', paddingBottom: '0.4rem' }}>
                                    👤 Datos Personales
                                </p>
                                <div className="row">
                                    <Field label="CI" name="ci" required col="col-md-3" />
                                    <Field label="Nombres" name="nombres" required col="col-md-3" />
                                    <Field label="Apellidos" name="apellidos" required col="col-md-3" />
                                    <Field label="Fecha de Nacimiento" name="fecha_nac" type="date" required col="col-md-3" />
                                </div>
                                <div className="row">
                                    <div className="col-md-2">
                                        <div style={{ marginBottom: '0.85rem' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '0.3rem' }}>
                                                Género <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <select name="genero" className="form-select" style={{ borderRadius: 7, borderColor: '#e2e8f0', fontSize: '0.88rem', height: 38 }} value={form.genero} onChange={handleChange}>
                                                <option value="M">Masculino</option>
                                                <option value="F">Femenino</option>
                                                <option value="O">Otro</option>
                                            </select>
                                        </div>
                                    </div>
                                    <Field label="Teléfono" name="telefono" col="col-md-3" />
                                </div>

                                {/* Contacto y Procedencia */}
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '2px solid #eff6ff', paddingBottom: '0.4rem', marginTop: '0.5rem' }}>
                                    📬 Contacto y Procedencia
                                </p>
                                <div className="row">
                                    <Field label="Correo" name="correo" type="email" required col="col-md-4" />
                                    <Field label="Dirección" name="direccion" col="col-md-4" />
                                    <Field label="Ciudad" name="ciudad" col="col-md-2" />
                                    <Field label="Colegio de Procedencia" name="colegio_procedencia" col="col-md-4" />
                                </div>

                                {/* Opciones de Carrera */}
                                {!editando && (
                                    <>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '2px solid #eff6ff', paddingBottom: '0.4rem', marginTop: '0.5rem' }}>
                                            🎓 Opciones de Carrera
                                        </p>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div style={{ marginBottom: '0.85rem' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '0.3rem' }}>
                                                        Carrera Opción 1 <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <select name="carrera_opcion1_id" className="form-select" style={{ borderRadius: 7, borderColor: '#e2e8f0', fontSize: '0.88rem' }} value={form.carrera_opcion1_id} onChange={handleChange} required>
                                                        <option value="">Seleccionar carrera...</option>
                                                        {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div style={{ marginBottom: '0.85rem' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '0.3rem' }}>
                                                        Carrera Opción 2 <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <select name="carrera_opcion2_id" className="form-select" style={{ borderRadius: 7, borderColor: '#e2e8f0', fontSize: '0.88rem' }} value={form.carrera_opcion2_id} onChange={handleChange} required>
                                                        <option value="">Seleccionar carrera...</option>
                                                        {carreras.map(c => <option key={c.id} value={c.id} disabled={String(c.id) === String(form.carrera_opcion1_id)}>{c.nombre}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="d-flex gap-2 mt-1">
                                    <button type="submit" style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(37,99,235,0.35)' }}>
                                        {editando ? '💾 Actualizar' : '✅ Registrar'}
                                    </button>
                                    <button type="button" style={{ background: 'transparent', border: '1.5px solid #94a3b8', color: '#64748b', borderRadius: 8, padding: '0.5rem 1.25rem', cursor: 'pointer' }} onClick={() => setMostrarForm(false)}>
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
                        { label: 'Total Postulantes', val: stats.total_postulantes, grad: 'linear-gradient(135deg,#1a3a6b,#2563eb)', icon: '👥' },
                        { label: 'Aprobados',          val: stats.aprobados,         grad: 'linear-gradient(135deg,#15803d,#16a34a)', icon: '✅' },
                        { label: 'Reprobados',         val: stats.reprobados,        grad: 'linear-gradient(135deg,#dc2626,#ef4444)', icon: '❌' },
                        { label: 'En Proceso',         val: stats.en_proceso,        grad: 'linear-gradient(135deg,#d97706,#f59e0b)', icon: '⏳' },
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

                {/* ── City chart ── */}
                {stats.ciudades.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1rem' }}>📊</span>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Postulantes por Ciudad</span>
                            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', marginLeft: 4 }}>Top 5</span>
                        </div>
                        <div style={{ padding: '1.25rem 1.5rem' }}>
                            {(() => {
                                const max = Math.max(...stats.ciudades.map(c => Number(c.total)));
                                const total = typeof stats.total_postulantes === 'number' ? stats.total_postulantes : 1;
                                return stats.ciudades.map((c, i) => {
                                    const pct = Math.round(Number(c.total) / total * 100);
                                    const barW = Math.round(Number(c.total) / max * 100);
                                    return (
                                        <div key={c.ciudad} style={{ marginBottom: i < stats.ciudades.length - 1 ? '1rem' : 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{c.ciudad}</span>
                                                <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{c.total} postulantes ({pct}%)</span>
                                            </div>
                                            <div style={{ background: '#e2e8f0', borderRadius: 99, height: 10, overflow: 'hidden' }}>
                                                <div style={{ width: `${barW}%`, height: '100%', background: 'linear-gradient(90deg,#1a3a6b,#3b82f6)', borderRadius: 99, transition: 'width .4s ease' }} />
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
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
                            <strong style={{ color: '#1a3a6b' }}>{postulantes.length}</strong> postulantes
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VACIO); }}
                            style={{ background: mostrarForm ? '#64748b' : 'linear-gradient(90deg,#1a3a6b,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            {mostrarForm ? '✕ Cancelar' : '+ Nuevo Postulante'}
                        </button>
                        <button onClick={exportarCSV} disabled={postulantes.length === 0} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                            ⬇ CSV
                        </button>
                        <button onClick={exportarPDF} disabled={postulantes.length === 0} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                            ⬇ PDF
                        </button>
                    </div>
                </div>

                {/* ── Table ── */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table className="table mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr style={{ background: '#1a3a6b' }}>
                                    {['#','CI','Nombres','Apellidos','Género','Teléfono','Correo','Ciudad','Grupo','Acciones'].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {postulantes.length === 0 ? (
                                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</div>
                                        No hay postulantes registrados
                                    </td></tr>
                                ) : postulantes.map((p, i) => (
                                    <TR key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '0.8rem' }}>{i + 1}</td>
                                        <td style={{ ...tdStyle, fontWeight: 600, color: '#1e293b' }}>{p.ci}</td>
                                        <td style={tdStyle}>{p.nombres}</td>
                                        <td style={tdStyle}>{p.apellidos}</td>
                                        <td style={tdStyle}>
                                            <span style={{ background: p.genero === 'M' ? '#dbeafe' : p.genero === 'F' ? '#fce7f3' : '#f3f4f6', color: p.genero === 'M' ? '#1d4ed8' : p.genero === 'F' ? '#be185d' : '#374151', borderRadius: 20, padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                                {p.genero === 'M' ? '♂ Masc.' : p.genero === 'F' ? '♀ Fem.' : 'Otro'}
                                            </span>
                                        </td>
                                        <td style={{ ...tdStyle, color: '#64748b' }}>{p.telefono || '—'}</td>
                                        <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.82rem' }}>{p.correo}</td>
                                        <td style={{ ...tdStyle, color: '#64748b' }}>{p.ciudad || '—'}</td>
                                        <td style={tdStyle}>
                                            {p.grupo_nombre
                                                ? <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, padding: '0.2rem 0.7rem', fontSize: '0.75rem', fontWeight: 700 }}>{p.grupo_nombre}</span>
                                                : <span style={{ background: '#f1f5f9', color: '#94a3b8', borderRadius: 20, padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>Sin grupo</span>
                                            }
                                        </td>
                                        <td style={tdStyle}>
                                            <button onClick={() => editar(p)} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.6rem', cursor: 'pointer', marginRight: 4, fontSize: '0.8rem' }} title="Editar">✏️</button>
                                            <button onClick={() => eliminar(p.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }} title="Eliminar">🗑️</button>
                                        </td>
                                    </TR>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Postulantes;
