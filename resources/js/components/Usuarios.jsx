import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ROLES = [
    { id: 1, label: 'Administrador', icon: '🔑', bg: '#f5f3ff', color: '#7c3aed' },
    { id: 2, label: 'Docente',        icon: '👨‍🏫', bg: '#dcfce7', color: '#15803d' },
    { id: 3, label: 'Postulante',     icon: '🎓', bg: '#ffedd5', color: '#c2410c' },
];

function RolBadge({ nombre }) {
    if (!nombre) return <span style={{ color: '#94a3b8' }}>—</span>;
    const n = nombre.toLowerCase();
    if (n.includes('admin'))   return <span style={{ background: '#f5f3ff', color: '#7c3aed', borderRadius: 20, padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}>🔑 Administrador</span>;
    if (n.includes('docente')) return <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}>👨‍🏫 Docente</span>;
    return <span style={{ background: '#ffedd5', color: '#c2410c', borderRadius: 20, padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}>🎓 Postulante</span>;
}

function EstadoBadge({ estado }) {
    return estado
        ? <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />Activo</span>
        : <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 20, padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}>Inactivo</span>;
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

const FORM_VACIO = { username: '', correo: '', password: '', rol_id: '2' };

/**
 * CU7 - GESTIONAR USUARIOS Y ROLES
 * Mensaje 1.5: ejecutarCRUD() → handleSubmit()
 * Mensaje 1.7: procesarArchivoCSV() → handleCargarCSV()
 * Mensaje 1.11: mostrarResultado() → alert con resumen
 */
export default function Usuarios({ onBack }) {
    const [usuarios, setUsuarios]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [busqueda, setBusqueda]         = useState('');
    const [mostrarModal, setMostrarModal] = useState(false);
    const [editando, setEditando]         = useState(null);
    const [form, setForm]                 = useState(FORM_VACIO);
    const [errores, setErrores]           = useState({});
    const [enviando, setEnviando]         = useState(false);
    const [mensaje, setMensaje]           = useState('');
    const [error, setError]               = useState('');
    const [verPass, setVerPass]           = useState(false);

    const [csvFile, setCsvFile]           = useState(null);
    const [cargandoCSV, setCargandoCSV]   = useState(false);
    const [resultadoCSV, setResultadoCSV] = useState(null);
    const csvRef = useRef();

    useEffect(() => { cargar(); }, []);

    async function cargar() {
        setLoading(true);
        try {
            const res  = await fetch('/api/usuarios');
            setUsuarios(await res.json());
        } catch { setError('Error al cargar usuarios.'); }
        finally { setLoading(false); }
    }

    async function buscar(q) {
        setBusqueda(q);
        if (!q.trim()) { cargar(); return; }
        const res  = await fetch(`/api/usuarios/search?q=${encodeURIComponent(q)}`);
        setUsuarios(await res.json());
    }

    const stats = {
        total:           usuarios.length,
        administradores: usuarios.filter(u => u.rol_id === 1).length,
        docentes:        usuarios.filter(u => u.rol_id === 2).length,
        postulantes:     usuarios.filter(u => u.rol_id === 3).length,
    };

    function abrirModal(u = null) {
        setEditando(u);
        setForm(u ? { username: u.username, correo: u.correo, password: '', rol_id: String(u.rol_id) } : FORM_VACIO);
        setErrores({}); setVerPass(false); setMostrarModal(true);
    }

    async function guardar() {
        setEnviando(true); setErrores({});
        const url    = editando ? `/api/usuarios/${editando.id}` : '/api/usuarios';
        const method = editando ? 'PUT' : 'POST';
        const body   = { ...form, rol_id: parseInt(form.rol_id) };
        if (editando && !body.password) delete body.password;
        const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (res.ok) {
            setMostrarModal(false); setMensaje(editando ? 'Usuario actualizado.' : 'Usuario creado.');
            setTimeout(() => setMensaje(''), 3000); cargar();
        } else {
            if (data.errors) {
                const mapped = {};
                Object.entries(data.errors).forEach(([k, v]) => { mapped[k] = v[0]; });
                setErrores(mapped);
            } else { setError(data.message || 'Error al guardar.'); setTimeout(() => setError(''), 4000); }
        }
        setEnviando(false);
    }

    async function toggleEstado(u) {
        const ep = u.estado ? 'desactivar' : 'activar';
        const res = await fetch(`/api/usuarios/${u.id}/${ep}`, { method: 'PUT', headers: { 'Accept': 'application/json' } });
        if (res.ok) setUsuarios(us => us.map(x => x.id === u.id ? { ...x, estado: !u.estado } : x));
    }

    async function handleCargarCSV() {
        if (!csvFile) return;
        setCargandoCSV(true); setResultadoCSV(null);
        const fd = new FormData(); fd.append('archivo', csvFile);
        const res  = await fetch('/api/usuarios/cargar-csv', { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd });
        const data = await res.json();
        setResultadoCSV(data); setCargandoCSV(false); setCsvFile(null);
        if (csvRef.current) csvRef.current.value = '';
        if (data.creados > 0) cargar();
    }

    const exportarCSV = () => {
        const cab  = ['#','Username','Correo','Rol','Estado'];
        const filas = usuarios.map((u, i) => [i + 1, u.username, u.correo, u.rol_nombre ?? '—', u.estado ? 'Activo' : 'Inactivo']);
        const csv  = [cab, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })); a.download = 'usuarios.csv'; a.click();
        URL.revokeObjectURL(a.href);
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        const fecha = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.setFontSize(16); doc.setTextColor(26, 58, 107); doc.text('CUP-FICCT - Usuarios del Sistema', 14, 18);
        doc.setFontSize(9); doc.setTextColor(100); doc.text(`Total: ${usuarios.length} usuarios  |  Generado: ${fecha}`, 14, 26);
        autoTable(doc, {
            startY: 32,
            head: [['#','Username','Correo','Rol','Estado']],
            body: usuarios.map((u, i) => [i + 1, u.username, u.correo, u.rol_nombre ?? '—', u.estado ? 'Activo' : 'Inactivo']),
            headStyles: { fillColor: [26, 58, 107], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [240, 245, 255] },
        });
        doc.save('usuarios.pdf');
    };

    const thStyle = { backgroundColor: '#1a3a6b', color: '#ffffff', padding: '12px 16px', fontWeight: '600', fontSize: '13px', letterSpacing: '0.5px', borderBottom: '2px solid #2563eb', whiteSpace: 'nowrap' };
    const tdStyle = { padding: '0.7rem 1rem', fontSize: '0.88rem', verticalAlign: 'middle' };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

            {/* ── Navbar ── */}
            <nav style={{ background: 'linear-gradient(135deg,#1a3a6b 0%,#2563eb 100%)', padding: '0 1.5rem', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(26,58,107,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>👤</span>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>CUP - FICCT — Usuarios y Roles</div>
                        <div className="d-none d-sm-block" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>Sistema de Admisión Universitaria</div>
                    </div>
                </div>
                <button onClick={onBack} style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.45)', color: '#fff', borderRadius: 7, padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                    <span className="d-none d-sm-inline">← Volver al Dashboard</span>
                    <span className="d-sm-none">←</span>
                </button>
            </nav>

            <div className="container-fluid px-3 px-md-4" style={{ paddingTop: '1.75rem', paddingBottom: '1.75rem' }}>

                {/* ── Stats ── */}
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total Usuarios',  val: stats.total,           grad: 'linear-gradient(135deg,#1a3a6b,#2563eb)', icon: '👥' },
                        { label: 'Administradores', val: stats.administradores, grad: 'linear-gradient(135deg,#6d28d9,#7c3aed)', icon: '🔑' },
                        { label: 'Docentes',        val: stats.docentes,        grad: 'linear-gradient(135deg,#15803d,#16a34a)', icon: '👨‍🏫' },
                        { label: 'Postulantes',     val: stats.postulantes,     grad: 'linear-gradient(135deg,#ea580c,#f97316)', icon: '🎓' },
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

                {/* ── CSV Upload ── */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>📤</span>
                        <h6 style={{ fontWeight: 700, color: '#1a3a6b', margin: 0 }}>Carga Masiva de Usuarios</h6>
                    </div>
                    <div className="row g-3 align-items-start">
                        <div className="col-md-5">
                            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Formato CSV esperado:</p>
                            <pre style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.75rem', margin: 0, color: '#1e293b' }}>
{`username,correo,password,rol_id
juan.perez,juan@ficct.edu.bo,pass123,2
admin.nuevo,admin@ficct.edu.bo,pass123,1`}
                            </pre>
                            <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                                rol_id: <strong>1</strong> = Administrador · <strong>2</strong> = Docente · <strong>3</strong> = Postulante
                            </div>
                        </div>
                        <div className="col-md-7">
                            {/* Drop zone */}
                            <div
                                onClick={() => csvRef.current.click()}
                                style={{ border: '2px dashed #bfdbfe', borderRadius: 10, padding: '1.25rem', textAlign: 'center', cursor: 'pointer', background: csvFile ? '#eff6ff' : '#fafcff', transition: 'all 0.2s', marginBottom: '0.75rem' }}
                            >
                                <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>📎</div>
                                <p style={{ color: csvFile ? '#1d4ed8' : '#94a3b8', fontSize: '0.85rem', margin: 0, fontWeight: csvFile ? 600 : 400 }}>
                                    {csvFile ? csvFile.name : 'Arrastra tu CSV aquí o haz clic para seleccionar'}
                                </p>
                            </div>
                            <input ref={csvRef} type="file" accept=".csv" className="d-none"
                                onChange={e => {
                                    const f = e.target.files[0];
                                    if (f && !f.name.toLowerCase().endsWith('.csv')) { setError('Solo se aceptan archivos .csv'); return; }
                                    setCsvFile(f); setResultadoCSV(null);
                                }}
                            />
                            <button
                                onClick={handleCargarCSV}
                                disabled={!csvFile || cargandoCSV}
                                style={{ background: !csvFile || cargandoCSV ? '#94a3b8' : 'linear-gradient(90deg,#15803d,#16a34a)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.25rem', fontWeight: 600, cursor: !csvFile || cargandoCSV ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
                            >
                                {cargandoCSV ? <><span className="spinner-border spinner-border-sm me-1" />Cargando...</> : '⬆ Cargar CSV'}
                            </button>
                            {resultadoCSV && (
                                <div className={`alert py-2 small mt-2 mb-0 ${resultadoCSV.creados > 0 ? 'alert-success' : 'alert-warning'}`} style={{ borderRadius: 8 }}>
                                    <strong>{resultadoCSV.mensaje}</strong>
                                    {resultadoCSV.errores?.length > 0 && (
                                        <ul className="mb-0 mt-1 ps-3">
                                            {resultadoCSV.errores.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
                                            {resultadoCSV.errores.length > 6 && <li>... y {resultadoCSV.errores.length - 6} más</li>}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Messages ── */}
                {mensaje && <div className="alert alert-success py-2 small mb-3" style={{ borderRadius: 8 }}>{mensaje}</div>}
                {error   && <div className="alert alert-danger  py-2 small mb-3" style={{ borderRadius: 8 }}>{error}</div>}

                {/* ── Table card ── */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    {/* Search + actions header */}
                    <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid #e8edf5', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
                                <input
                                    type="text"
                                    className="form-control"
                                    style={{ paddingLeft: '2.2rem', borderRadius: 8, borderColor: '#e2e8f0', fontSize: '0.88rem', height: 38 }}
                                    placeholder="Buscar por username o correo..."
                                    value={busqueda}
                                    onChange={e => buscar(e.target.value)}
                                />
                            </div>
                            <span style={{ color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                <strong style={{ color: '#1a3a6b' }}>{usuarios.length}</strong> usuarios
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button onClick={() => abrirModal()} style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>+ Nuevo</button>
                            <button onClick={exportarCSV} disabled={!usuarios.length} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>⬇ CSV</button>
                            <button onClick={exportarPDF} disabled={!usuarios.length} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>⬇ PDF</button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner-border text-primary" /></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr style={{ background: '#1a3a6b' }}>
                                        {['#','Username','Correo','Contraseña','Rol','Estado','Acciones'].map(h => (
                                            <th key={h} style={thStyle}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuarios.length === 0 ? (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Sin resultados</td></tr>
                                    ) : usuarios.map((u, i) => (
                                        <TR key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                            <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '0.8rem' }}>{i + 1}</td>
                                            <td style={{ ...tdStyle, fontWeight: 600, color: '#1e293b' }}>{u.username}</td>
                                            <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.82rem' }}>{u.correo}</td>
                                            <td style={{ ...tdStyle }}>
                                                {u.password_texto
                                                    ? <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: '#fef9c3', color: '#78350f', borderRadius: 5, padding: '0.15rem 0.5rem', fontWeight: 600 }}>{u.password_texto}</span>
                                                    : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                                                }
                                            </td>
                                            <td style={tdStyle}><RolBadge nombre={u.rol_nombre} /></td>
                                            <td style={tdStyle}><EstadoBadge estado={u.estado} /></td>
                                            <td style={tdStyle}>
                                                <button onClick={() => abrirModal(u)} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.6rem', cursor: 'pointer', marginRight: 4, fontSize: '0.8rem' }}>✏️ Editar</button>
                                                <button onClick={() => toggleEstado(u)} style={{ background: u.estado ? '#dc2626' : '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                                                    {u.estado ? '🚫 Desactivar' : '✅ Activar'}
                                                </button>
                                            </td>
                                        </TR>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal ── */}
            {mostrarModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem' }}>
                    <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden', animation: 'fadeSlideUp 0.25s ease', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1.1rem' }}>{editando ? '✏️' : '➕'}</span>
                                <h5 style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: '1rem' }}>
                                    {editando ? 'Editar Usuario' : 'Nuevo Usuario'}
                                </h5>
                            </div>
                            <button onClick={() => setMostrarModal(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            {[
                                { label: 'Username', key: 'username', type: 'text',     required: true },
                                { label: 'Correo Electrónico', key: 'correo', type: 'email', required: true },
                            ].map(({ label, key, type, required }) => (
                                <div style={{ marginBottom: '1rem' }} key={key}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '0.3rem' }}>
                                        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
                                    </label>
                                    <input type={type} className={`form-control ${errores[key] ? 'is-invalid' : ''}`}
                                        style={{ borderRadius: 8, borderColor: errores[key] ? '#ef4444' : '#e2e8f0', fontSize: '0.9rem', height: 40 }}
                                        value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                                    {errores[key] && <div className="invalid-feedback">{errores[key]}</div>}
                                </div>
                            ))}
                            {/* Password with eye toggle */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '0.3rem' }}>
                                    {editando ? 'Nueva Contraseña (vacío = sin cambios)' : 'Contraseña'}{!editando && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input type={verPass ? 'text' : 'password'} className={`form-control ${errores.password ? 'is-invalid' : ''}`}
                                        style={{ borderRadius: 8, borderColor: errores.password ? '#ef4444' : '#e2e8f0', fontSize: '0.9rem', height: 40, paddingRight: '2.5rem' }}
                                        value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                                    <button type="button" tabIndex={-1} onClick={() => setVerPass(v => !v)}
                                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>
                                        {verPass ? '🙈' : '👁'}
                                    </button>
                                </div>
                                {errores.password && <div className="invalid-feedback d-block">{errores.password}</div>}
                            </div>
                            {/* Role select */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '0.3rem' }}>
                                    Rol <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select className={`form-select ${errores.rol_id ? 'is-invalid' : ''}`}
                                    style={{ borderRadius: 8, borderColor: errores.rol_id ? '#ef4444' : '#e2e8f0', fontSize: '0.9rem', height: 40 }}
                                    value={form.rol_id} onChange={e => setForm(f => ({ ...f, rol_id: e.target.value }))}>
                                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
                                </select>
                                {errores.rol_id && <div className="invalid-feedback">{errores.rol_id}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button style={{ background: 'transparent', border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: 8, padding: '0.5rem 1.25rem', cursor: 'pointer', flex: 1 }} onClick={() => setMostrarModal(false)}>
                                    Cancelar
                                </button>
                                <button style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: enviando ? 'not-allowed' : 'pointer', flex: 1, boxShadow: '0 3px 10px rgba(37,99,235,0.35)' }}
                                    onClick={guardar} disabled={enviando}>
                                    {enviando ? <><span className="spinner-border spinner-border-sm me-1" />Guardando...</> : '💾 Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
