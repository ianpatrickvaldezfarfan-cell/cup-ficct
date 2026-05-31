import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Modulo de gestion de usuarios y roles (CU7 - Administrador).
 *
 * Permite administrar todas las cuentas del sistema con sus roles.
 * Funcionalidades:
 * - CRUD individual con modal de creacion/edicion (password opcional en edicion)
 * - Activar/desactivar cuentas sin eliminarlas de la BD
 * - Carga masiva CSV: valida todas las filas primero, luego inserta en transaccion
 * - Busqueda en tiempo real llamando a /api/usuarios/search
 * - Estadisticas por rol en tarjetas de colores
 * - Exportacion CSV (BOM UTF-8) y PDF
 *
 * @param {Function} onBack Callback para volver al Dashboard
 * @param {Object}   user   Usuario autenticado (para header X-User-Id en bitacora)
 */

// Roles disponibles en el sistema (deben coincidir con tabla roles en BD)
const ROLES = [
    { id: 1, label: 'Administrador' },
    { id: 2, label: 'Docente'        },
    { id: 3, label: 'Postulante'     },
];

function RolBadge({ nombre }) {
    if (!nombre) return <span className="text-muted">—</span>;
    const n = nombre.toLowerCase();
    if (n.includes('admin'))     return <span className="badge text-white" style={{ backgroundColor: '#6f42c1' }}>Administrador</span>;
    if (n.includes('docente'))   return <span className="badge bg-success">Docente</span>;
    return <span className="badge text-white" style={{ backgroundColor: '#fd7e14' }}>Postulante</span>;
}

const FORM_VACIO = { username: '', correo: '', password: '', rol_id: '2' };

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

    const [csvFile, setCsvFile]           = useState(null);
    const [cargandoCSV, setCargandoCSV]   = useState(false);
    const [resultadoCSV, setResultadoCSV] = useState(null);
    const csvRef = useRef();

    useEffect(() => { cargar(); }, []);

    async function cargar() {
        setLoading(true);
        try {
            const res  = await fetch('/api/usuarios');
            const data = await res.json();
            setUsuarios(data);
        } catch {
            setError('Error al cargar usuarios.');
        } finally {
            setLoading(false);
        }
    }

    async function buscar(q) {
        setBusqueda(q);
        if (!q.trim()) { cargar(); return; }
        const res  = await fetch(`/api/usuarios/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setUsuarios(data);
    }

    const stats = {
        total:           usuarios.length,
        administradores: usuarios.filter(u => u.rol_id === 1).length,
        docentes:        usuarios.filter(u => u.rol_id === 2).length,
        postulantes:     usuarios.filter(u => u.rol_id === 3).length,
    };

    function abrirModal(u = null) {
        setEditando(u);
        setForm(u
            ? { username: u.username, correo: u.correo, password: '', rol_id: String(u.rol_id) }
            : FORM_VACIO
        );
        setErrores({});
        setMostrarModal(true);
    }

    async function guardar() {
        setEnviando(true);
        setErrores({});
        const url    = editando ? `/api/usuarios/${editando.id}` : '/api/usuarios';
        const method = editando ? 'PUT' : 'POST';
        const body   = { ...form, rol_id: parseInt(form.rol_id) };
        if (editando && !body.password) delete body.password;

        const res  = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();

        if (res.ok) {
            setMostrarModal(false);
            setMensaje(editando ? 'Usuario actualizado.' : 'Usuario creado.');
            setTimeout(() => setMensaje(''), 3000);
            cargar();
        } else {
            if (data.errors) {
                const mapped = {};
                Object.entries(data.errors).forEach(([k, v]) => { mapped[k] = v[0]; });
                setErrores(mapped);
            } else {
                setError(data.message || 'Error al guardar.');
                setTimeout(() => setError(''), 4000);
            }
        }
        setEnviando(false);
    }

    async function toggleEstado(u) {
        const endpoint = u.estado ? 'desactivar' : 'activar';
        const res = await fetch(`/api/usuarios/${u.id}/${endpoint}`, {
            method: 'PUT', headers: { 'Accept': 'application/json' },
        });
        if (res.ok) {
            setUsuarios(us => us.map(x => x.id === u.id ? { ...x, estado: !u.estado } : x));
        }
    }

    async function handleCargarCSV() {
        if (!csvFile) return;
        setCargandoCSV(true);
        setResultadoCSV(null);
        const fd = new FormData();
        fd.append('archivo', csvFile);
        const res  = await fetch('/api/usuarios/cargar-csv', {
            method: 'POST', headers: { 'Accept': 'application/json' }, body: fd,
        });
        const data = await res.json();
        setResultadoCSV(data);
        setCargandoCSV(false);
        setCsvFile(null);
        if (csvRef.current) csvRef.current.value = '';
        if (data.creados > 0) cargar();
    }

    const exportarCSV = () => {
        const cab  = ['#', 'Username', 'Correo', 'Rol', 'Estado'];
        const filas = usuarios.map((u, i) => [
            i + 1, u.username, u.correo, u.rol_nombre ?? '—', u.estado ? 'Activo' : 'Inactivo',
        ]);
        const csv  = [cab, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const a    = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'usuarios.csv'; a.click();
        URL.revokeObjectURL(a.href);
    };

    const exportarPDF = () => {
        const doc   = new jsPDF();
        const fecha = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.setFontSize(16); doc.setTextColor(13, 110, 253);
        doc.text('CUP-FICCT - Usuarios del Sistema', 14, 18);
        doc.setFontSize(9); doc.setTextColor(100);
        doc.text(`Total: ${usuarios.length} usuarios  |  Generado: ${fecha}`, 14, 26);
        autoTable(doc, {
            startY: 32,
            head: [['#', 'Username', 'Correo', 'Rol', 'Estado']],
            body: usuarios.map((u, i) => [
                i + 1, u.username, u.correo, u.rol_nombre ?? '—', u.estado ? 'Activo' : 'Inactivo',
            ]),
            headStyles: { fillColor: [13, 110, 253], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [240, 245, 255] },
        });
        doc.text(`Total: ${usuarios.length} usuario(s)`, 14, doc.lastAutoTable.finalY + 8);
        doc.save('usuarios.pdf');
    };

    return (
        <div>
            <nav className="navbar navbar-dark bg-primary px-4">
                <span className="navbar-brand fw-bold">CUP - FICCT &mdash; Usuarios y Roles</span>
                <button className="btn btn-outline-light btn-sm" onClick={onBack}>&larr; Volver al Dashboard</button>
            </nav>

            <div className="container-fluid p-4">
                <h4 className="mb-4">Gestión de Usuarios</h4>

                {/* Estadísticas */}
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total Usuarios',  val: stats.total,           color: '#0d6efd' },
                        { label: 'Administradores', val: stats.administradores, color: '#6f42c1' },
                        { label: 'Docentes',         val: stats.docentes,       color: '#198754' },
                        { label: 'Postulantes',      val: stats.postulantes,    color: '#fd7e14' },
                    ].map(({ label, val, color }) => (
                        <div key={label} className="col-md-3">
                            <div className="card text-white h-100" style={{ backgroundColor: color }}>
                                <div className="card-body">
                                    <h6 className="card-title">{label}</h6>
                                    <h2 className="fw-bold">{val}</h2>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Carga masiva CSV */}
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-success text-white py-2">
                        <h6 className="mb-0 fw-bold">Carga Masiva de Usuarios</h6>
                    </div>
                    <div className="card-body">
                        <div className="row g-3 align-items-start">
                            <div className="col-md-5">
                                <p className="small text-muted mb-1 fw-semibold">Formato CSV esperado:</p>
                                <pre className="bg-light border rounded p-2 mb-1" style={{ fontSize: '0.76rem', whiteSpace: 'pre' }}>
{`username,correo,password,rol_id
juan.perez,juan@ficct.edu.bo,pass123,2
admin.nuevo,admin@ficct.edu.bo,pass123,1`}
                                </pre>
                                <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                                    rol_id: <strong>1</strong> = Administrador · <strong>2</strong> = Docente · <strong>3</strong> = Postulante
                                </div>
                            </div>
                            <div className="col-md-7">
                                <div className="d-flex flex-column gap-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <input
                                            ref={csvRef}
                                            type="file"
                                            accept=".csv"
                                            className="d-none"
                                            onChange={e => {
                                                const f = e.target.files[0];
                                                if (f && !f.name.toLowerCase().endsWith('.csv')) {
                                                    setError('Solo se aceptan archivos .csv');
                                                    return;
                                                }
                                                setCsvFile(f);
                                                setResultadoCSV(null);
                                            }}
                                        />
                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => csvRef.current.click()}
                                        >
                                            Seleccionar archivo CSV
                                        </button>
                                        {csvFile && (
                                            <span className="badge bg-light text-dark border small">
                                                {csvFile.name}
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        className="btn btn-success btn-sm"
                                        style={{ width: 'fit-content' }}
                                        onClick={handleCargarCSV}
                                        disabled={!csvFile || cargandoCSV}
                                    >
                                        {cargandoCSV
                                            ? <><span className="spinner-border spinner-border-sm me-1" />Cargando...</>
                                            : '⬆ Cargar CSV'
                                        }
                                    </button>

                                    {resultadoCSV && (
                                        <div className={`alert py-2 small mb-0 ${resultadoCSV.creados > 0 ? 'alert-success' : 'alert-warning'}`}>
                                            <strong>{resultadoCSV.mensaje}</strong>
                                            {resultadoCSV.errores?.length > 0 && (
                                                <ul className="mb-0 mt-1 ps-3">
                                                    {resultadoCSV.errores.slice(0, 6).map((e, i) => (
                                                        <li key={i}>{e}</li>
                                                    ))}
                                                    {resultadoCSV.errores.length > 6 && (
                                                        <li>... y {resultadoCSV.errores.length - 6} más</li>
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {mensaje && <div className="alert alert-success py-2 small">{mensaje}</div>}
                {error   && <div className="alert alert-danger  py-2 small">{error}</div>}

                {/* Tabla */}
                <div className="card shadow-sm">
                    <div className="card-header bg-dark text-white">
                        {/* Buscador */}
                        <div className="mb-2">
                            <div className="input-group input-group-sm">
                                <input
                                    type="text"
                                    className="form-control bg-secondary border-0 text-white"
                                    placeholder="🔍 Buscar por username o correo..."
                                    value={busqueda}
                                    onChange={e => buscar(e.target.value)}
                                />
                                {busqueda && (
                                    <button className="btn btn-secondary border-0" onClick={() => buscar('')}>✕</button>
                                )}
                            </div>
                        </div>
                        {/* Acciones + contador */}
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <div>
                                <strong>Lista de Usuarios</strong>
                                <span className="text-secondary ms-2 small fw-normal">{usuarios.length} registros</span>
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-primary btn-sm" onClick={() => abrirModal()}>+ Nuevo</button>
                                <button className="btn btn-success btn-sm" onClick={exportarCSV} disabled={!usuarios.length}>⬇ CSV</button>
                                <button className="btn btn-danger  btn-sm" onClick={exportarPDF} disabled={!usuarios.length}>⬇ PDF</button>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-secondary">
                                    <tr>
                                        <th>#</th>
                                        <th>Username</th>
                                        <th>Correo</th>
                                        <th>Rol</th>
                                        <th className="text-center">Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuarios.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center text-muted py-4">Sin resultados</td></tr>
                                    ) : usuarios.map((u, i) => (
                                        <tr key={u.id}>
                                            <td className="text-muted small">{i + 1}</td>
                                            <td className="fw-semibold">{u.username}</td>
                                            <td className="text-muted small">{u.correo}</td>
                                            <td><RolBadge nombre={u.rol_nombre} /></td>
                                            <td className="text-center">
                                                <span className={`badge ${u.estado ? 'bg-success' : 'bg-danger'}`}>
                                                    {u.estado ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-warning btn-sm me-1"
                                                    onClick={() => abrirModal(u)}
                                                >
                                                    ✏️ Editar
                                                </button>
                                                <button
                                                    className={`btn btn-sm ${u.estado ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                                    onClick={() => toggleEstado(u)}
                                                >
                                                    {u.estado ? '🔒 Desactivar' : '✅ Activar'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Crear/Editar */}
            {mostrarModal && (
                <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">
                                    {editando ? '✏️ Editar Usuario' : '+ Nuevo Usuario'}
                                </h5>
                                <button className="btn-close btn-close-white" onClick={() => setMostrarModal(false)} />
                            </div>
                            <div className="modal-body">
                                {[
                                    { label: 'Username', key: 'username', type: 'text',     req: true },
                                    { label: 'Correo Electrónico', key: 'correo', type: 'email', req: true },
                                    {
                                        label: editando ? 'Nueva contraseña (vacío = sin cambios)' : 'Contraseña',
                                        key: 'password', type: 'password', req: !editando,
                                    },
                                ].map(({ label, key, type, req }) => (
                                    <div key={key} className="mb-3">
                                        <label className="form-label fw-semibold small">
                                            {label}{req && <span className="text-danger ms-1">*</span>}
                                        </label>
                                        <input
                                            type={type}
                                            className={`form-control ${errores[key] ? 'is-invalid' : ''}`}
                                            value={form[key]}
                                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                        />
                                        {errores[key] && <div className="invalid-feedback">{errores[key]}</div>}
                                    </div>
                                ))}
                                <div className="mb-3">
                                    <label className="form-label fw-semibold small">
                                        Rol <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className={`form-select ${errores.rol_id ? 'is-invalid' : ''}`}
                                        value={form.rol_id}
                                        onChange={e => setForm(f => ({ ...f, rol_id: e.target.value }))}
                                    >
                                        {ROLES.map(r => (
                                            <option key={r.id} value={r.id}>{r.label}</option>
                                        ))}
                                    </select>
                                    {errores.rol_id && <div className="invalid-feedback">{errores.rol_id}</div>}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setMostrarModal(false)}>Cancelar</button>
                                <button className="btn btn-primary" onClick={guardar} disabled={enviando}>
                                    {enviando
                                        ? <><span className="spinner-border spinner-border-sm me-1" />Guardando...</>
                                        : 'Guardar'
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
