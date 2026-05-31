import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Modulo de gestion de docentes (CU8 - Administrador).
 *
 * Al registrar un docente, el backend crea automaticamente un usuario asociado
 * con rol_id=2 (docente), username=CI y password=Hash(CI).
 * Muestra estadisticas de titulaciones (maestria, diplomado, ambas).
 * Incluye vista de asignaciones docente-materia-grupo con turno calculado
 * a partir del horario (manana < 12:00, tarde < 18:00, noche >= 18:00).
 *
 * @param {Function} onBack Callback para volver al Dashboard
 * @param {Object}   user   Usuario autenticado (para header X-User-Id en bitacora)
 */

// Estado inicial del formulario
const FORM_VACIO = {
    ci: '', nombres: '', apellidos: '', correo: '',
    profesion: '', tiene_maestria: false, tiene_diplomado: false,
};

function Docentes({ onBack }) {
    const [docentes, setDocentes] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(FORM_VACIO);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [stats, setStats] = useState({ total: '-', con_maestria: '-', con_diplomado: '-', con_ambos: '-' });
    const [asignaciones, setAsignaciones] = useState([]);

    useEffect(() => {
        cargarDocentes();
        fetch('/api/docentes/estadisticas')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setStats(d); })
            .catch(() => {});
        fetch('/api/docentes/asignaciones')
            .then(r => r.ok ? r.json() : [])
            .then(d => setAsignaciones(d))
            .catch(() => {});
    }, []);

    const cargarDocentes = async () => {
        const res = await fetch('/api/docentes');
        const data = await res.json();
        setDocentes(data);
    };

    const buscar = async (e) => {
        setBusqueda(e.target.value);
        if (!e.target.value.trim()) { cargarDocentes(); return; }
        const res = await fetch(`/api/docentes/search?q=${encodeURIComponent(e.target.value)}`);
        const data = await res.json();
        setDocentes(data);
    };

    const handleChange = e => {
        const { name, type, checked, value } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setExito('');
        const url    = editando ? `/api/docentes/${editando}` : '/api/docentes';
        const method = editando ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(form),
        });
        const data = await res.json();

        if (res.ok) {
            setExito(editando ? 'Docente actualizado correctamente.' : 'Docente registrado correctamente.');
            cerrarForm();
            cargarDocentes();
        } else {
            const msgs = data.errors
                ? Object.values(data.errors).flat().join(' | ')
                : data.message || 'Error al guardar.';
            setError(msgs);
        }
    };

    const editar = (d) => {
        setEditando(d.id);
        setForm({
            ci:              d.ci || '',
            nombres:         d.nombres || '',
            apellidos:       d.apellidos || '',
            correo:          d.correo || '',
            profesion:       d.profesion || '',
            tiene_maestria:  !!d.tiene_maestria,
            tiene_diplomado: !!d.tiene_diplomado,
        });
        setMostrarForm(true);
        setError(''); setExito('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const eliminar = async (id) => {
        if (!confirm('¿Eliminar este docente? También se eliminará su cuenta de usuario.')) return;
        const res = await fetch(`/api/docentes/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) { setExito(data.message); cargarDocentes(); }
        else setError(data.message || 'Error al eliminar.');
    };

    const cerrarForm = () => {
        setMostrarForm(false);
        setEditando(null);
        setForm(FORM_VACIO);
        setError('');
    };

    const abrirNuevo = () => {
        cerrarForm();
        setMostrarForm(true);
    };

    const exportarCSV = () => {
        const cabecera = ['CI', 'Nombres', 'Apellidos', 'Profesion', 'Maestria', 'Diplomado', 'Correo'];
        const filas = docentes.map(d => [
            d.ci, d.nombres, d.apellidos, d.profesion,
            d.tiene_maestria ? 'Si' : 'No',
            d.tiene_diplomado ? 'Si' : 'No',
            d.correo,
        ]);
        const csv = [cabecera, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'docentes.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const exportarPDF = () => {
        const doc  = new jsPDF();
        const fecha = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });

        doc.setFontSize(16);
        doc.setTextColor(13, 110, 253);
        doc.text('CUP-FICCT - Lista de Docentes', 14, 18);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado: ${fecha}`, 14, 26);
        doc.text(`Total: ${docentes.length} docentes`, 14, 32);

        autoTable(doc, {
            startY: 38,
            head: [['CI', 'Nombres', 'Apellidos', 'Profesion', 'Maestria', 'Diplomado', 'Correo']],
            body: docentes.map(d => [
                d.ci, d.nombres, d.apellidos, d.profesion,
                d.tiene_maestria ? 'Si' : 'No',
                d.tiene_diplomado ? 'Si' : 'No',
                d.correo,
            ]),
            headStyles: { fillColor: [13, 110, 253], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [240, 245, 255] },
        });

        const totalY = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.text(`Total de docentes: ${docentes.length}`, 14, totalY);

        doc.save('docentes.pdf');
    };

    return (
        <div className="container-fluid p-4">
            {/* Encabezado */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <button className="btn btn-outline-secondary btn-sm me-2" onClick={onBack}>
                        &larr; Volver
                    </button>
                    <span className="fs-4 fw-bold">👨‍🏫 Módulo de Docentes</span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={mostrarForm && !editando ? cerrarForm : abrirNuevo}
                >
                    {mostrarForm && !editando ? 'Cancelar' : '+ Nuevo Docente'}
                </button>
            </div>

            {error && <div className="alert alert-danger alert-dismissible">
                {error}
                <button type="button" className="btn-close" onClick={() => setError('')} />
            </div>}
            {exito && <div className="alert alert-success alert-dismissible">
                {exito}
                <button type="button" className="btn-close" onClick={() => setExito('')} />
            </div>}

            {/* Formulario */}
            {mostrarForm && (
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-primary text-white fw-bold">
                        {editando ? 'Editar Docente' : 'Registrar Nuevo Docente'}
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-md-3">
                                    <label className="form-label">CI <span className="text-danger">*</span></label>
                                    <input
                                        name="ci"
                                        className="form-control"
                                        value={form.ci}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ej: 8467361"
                                    />
                                    {!editando && (
                                        <div className="form-text">Será el usuario y contraseña inicial.</div>
                                    )}
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Nombres <span className="text-danger">*</span></label>
                                    <input name="nombres" className="form-control" value={form.nombres} onChange={handleChange} required />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Apellidos <span className="text-danger">*</span></label>
                                    <input name="apellidos" className="form-control" value={form.apellidos} onChange={handleChange} required />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Correo <span className="text-danger">*</span></label>
                                    <input type="email" name="correo" className="form-control" value={form.correo} onChange={handleChange} required />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Profesión <span className="text-danger">*</span></label>
                                    <input name="profesion" className="form-control" value={form.profesion} onChange={handleChange} required placeholder="Ej: Ingeniero en Sistemas" />
                                </div>
                                <div className="col-md-3 d-flex align-items-end gap-4 pb-1">
                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            id="tiene_maestria"
                                            name="tiene_maestria"
                                            className="form-check-input"
                                            checked={form.tiene_maestria}
                                            onChange={handleChange}
                                        />
                                        <label className="form-check-label" htmlFor="tiene_maestria">
                                            Tiene Maestría
                                        </label>
                                    </div>
                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            id="tiene_diplomado"
                                            name="tiene_diplomado"
                                            className="form-check-input"
                                            checked={form.tiene_diplomado}
                                            onChange={handleChange}
                                        />
                                        <label className="form-check-label" htmlFor="tiene_diplomado">
                                            Tiene Diplomado
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 d-flex gap-2">
                                <button type="submit" className="btn btn-success">
                                    {editando ? 'Actualizar' : 'Registrar'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={cerrarForm}>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tarjetas de estadísticas */}
            <div className="row g-3 mb-4">
                <div className="col-md-3">
                    <div className="card text-white bg-primary h-100">
                        <div className="card-body">
                            <h6 className="card-title">Total Docentes</h6>
                            <h2 className="fw-bold">{stats.total}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-white bg-success h-100">
                        <div className="card-body">
                            <h6 className="card-title">Con Maestría</h6>
                            <h2 className="fw-bold">{stats.con_maestria}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-white h-100" style={{ backgroundColor: '#fd7e14' }}>
                        <div className="card-body">
                            <h6 className="card-title">Con Diplomado</h6>
                            <h2 className="fw-bold">{stats.con_diplomado}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-white h-100" style={{ backgroundColor: '#6f42c1' }}>
                        <div className="card-body">
                            <h6 className="card-title">Con Ambos</h6>
                            <h2 className="fw-bold">{stats.con_ambos}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla de asignaciones */}
            {asignaciones.length > 0 && (
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-dark text-white">
                        <strong>Asignaciones de docentes a grupos</strong>
                        <span className="text-secondary ms-2 small fw-normal">
                            {asignaciones.length} asignaciones
                        </span>
                    </div>
                    <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table className="table table-hover table-sm mb-0">
                            <thead className="table-secondary" style={{ position: 'sticky', top: 0 }}>
                                <tr>
                                    <th>Docente</th>
                                    <th>Materia</th>
                                    <th>Grupo</th>
                                    <th>Aula</th>
                                    <th>Horario</th>
                                    <th>Turno</th>
                                </tr>
                            </thead>
                            <tbody>
                                {asignaciones.map((a, i) => (
                                    <tr key={i}>
                                        <td className="fw-semibold">{a.docente}</td>
                                        <td>{a.materia}</td>
                                        <td>{a.grupo}</td>
                                        <td className="text-muted">{a.aula ?? '—'}</td>
                                        <td className="small text-muted">
                                            {a.horario_ini ? `${a.horario_ini}–${a.horario_fin}` : '—'}
                                        </td>
                                        <td>
                                            {a.turno === 'Manana' && <span className="badge bg-warning text-dark">🌅 Mañana</span>}
                                            {a.turno === 'Tarde'  && <span className="badge text-white" style={{ backgroundColor: '#fd7e14' }}>🌇 Tarde</span>}
                                            {a.turno === 'Noche'  && <span className="badge bg-dark">🌙 Noche</span>}
                                            {!a.turno             && <span className="text-muted">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Buscador */}
            <div className="mb-3">
                <input
                    className="form-control"
                    placeholder="🔍 Buscar por CI, nombre o apellido..."
                    value={busqueda}
                    onChange={buscar}
                />
            </div>

            {/* Barra de reportes */}
            <div className="d-flex align-items-center justify-content-between mb-3 p-3 bg-light rounded border">
                <span className="fw-semibold text-secondary">
                    Docentes disponibles: <strong className="text-dark">{docentes.length}</strong>
                </span>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-success btn-sm"
                        onClick={exportarCSV}
                        disabled={docentes.length === 0}
                    >
                        ⬇ Exportar CSV
                    </button>
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={exportarPDF}
                        disabled={docentes.length === 0}
                    >
                        ⬇ Exportar PDF
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className="card shadow-sm">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <span>Total: <strong>{docentes.length}</strong> docentes</span>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead className="table-dark">
                            <tr>
                                <th>#</th>
                                <th>CI</th>
                                <th>Nombres</th>
                                <th>Apellidos</th>
                                <th>Profesión</th>
                                <th className="text-center">Maestría</th>
                                <th className="text-center">Diplomado</th>
                                <th>Correo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {docentes.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center text-muted py-4">
                                        No hay docentes registrados
                                    </td>
                                </tr>
                            ) : docentes.map((d, i) => (
                                <tr key={d.id} className={editando === d.id ? 'table-warning' : ''}>
                                    <td>{i + 1}</td>
                                    <td className="fw-bold">{d.ci}</td>
                                    <td>{d.nombres}</td>
                                    <td>{d.apellidos}</td>
                                    <td className="small">{d.profesion}</td>
                                    <td className="text-center">
                                        {d.tiene_maestria
                                            ? <span className="badge bg-success">Sí</span>
                                            : <span className="badge bg-secondary">No</span>}
                                    </td>
                                    <td className="text-center">
                                        {d.tiene_diplomado
                                            ? <span className="badge bg-success">Sí</span>
                                            : <span className="badge bg-secondary">No</span>}
                                    </td>
                                    <td className="small text-muted">{d.correo}</td>
                                    <td>
                                        <button
                                            className="btn btn-warning btn-sm me-1"
                                            onClick={() => editar(d)}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => eliminar(d.id)}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Docentes;
