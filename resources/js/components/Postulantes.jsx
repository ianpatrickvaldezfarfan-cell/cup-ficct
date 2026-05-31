import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Modulo de gestion de postulantes (CU3 - Administrador).
 *
 * Funcionalidades principales:
 * - CRUD de postulantes: al crear, genera usuario+postulante+postulacion en transaccion
 * - Buscador en tiempo real por CI, nombre o apellido (llama a /api/postulantes/search)
 * - Columna "Grupo" obtenida via LEFT JOIN en el backend (gestion actual)
 * - Exportacion a CSV (BOM UTF-8 para compatibilidad Excel) y PDF con jsPDF
 * - Estadisticas: total, aprobados, reprobados, en proceso y top 5 ciudades
 *
 * @param {Function} onBack Callback para volver al Dashboard
 * @param {Object}   user   Usuario autenticado (se usa en header X-User-Id para bitacora)
 */

// Estado inicial del formulario de registro/edicion
const FORM_VACIO = {
    ci: '', nombres: '', apellidos: '', fecha_nac: '', genero: 'M',
    telefono: '', correo: '', direccion: '', colegio_procedencia: '', ciudad: '',
    carrera_opcion1_id: '', carrera_opcion2_id: '',
};

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
        setForm({ ci: p.ci, nombres: p.nombres, apellidos: p.apellidos, fecha_nac: p.fecha_nac, genero: p.genero, telefono: p.telefono || '', correo: p.correo, direccion: p.direccion || '', colegio_procedencia: p.colegio_procedencia || '', ciudad: p.ciudad || '' });
        setMostrarForm(true);
        setError(''); setExito('');
    };

    const eliminar = async (id) => {
        if (!confirm('¿Eliminar este postulante?')) return;
        await fetch(`/api/postulantes/${id}`, { method: 'DELETE', headers: { 'X-User-Id': user?.id ?? '' } });
        cargarPostulantes();
    };

    const exportarCSV = () => {
        const cabecera = ['CI', 'Nombres', 'Apellidos', 'Genero', 'Telefono', 'Correo', 'Ciudad', 'Colegio_Procedencia'];
        const filas = postulantes.map(p => [
            p.ci, p.nombres, p.apellidos,
            p.genero === 'M' ? 'Masculino' : p.genero === 'F' ? 'Femenino' : 'Otro',
            p.telefono || '',
            p.correo || '',
            p.ciudad || '',
            p.colegio_procedencia || '',
        ]);
        const csv = [cabecera, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'postulantes.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const exportarPDF = () => {
        const doc   = new jsPDF();
        const fecha = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });

        doc.setFontSize(16);
        doc.setTextColor(13, 110, 253);
        doc.text('CUP-FICCT - Lista de Postulantes', 14, 18);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado: ${fecha}`, 14, 26);
        doc.text(`Total: ${postulantes.length} postulantes`, 14, 32);

        autoTable(doc, {
            startY: 38,
            head: [['CI', 'Nombres', 'Apellidos', 'Genero', 'Telefono', 'Correo', 'Ciudad']],
            body: postulantes.map(p => [
                p.ci, p.nombres, p.apellidos,
                p.genero === 'M' ? 'Masc.' : p.genero === 'F' ? 'Fem.' : 'Otro',
                p.telefono || '-',
                p.correo || '-',
                p.ciudad || '-',
            ]),
            headStyles: { fillColor: [13, 110, 253], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [240, 245, 255] },
        });

        const totalY = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.text(`Total de postulantes: ${postulantes.length}`, 14, totalY);

        doc.save('postulantes.pdf');
    };

    return (
        <div className="container-fluid p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <button className="btn btn-outline-secondary btn-sm me-2" onClick={onBack}>← Volver</button>
                    <span className="fs-4 fw-bold">👥 Módulo de Postulantes</span>
                </div>
                <button className="btn btn-primary" onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(FORM_VACIO); }}>
                    {mostrarForm ? 'Cancelar' : '+ Nuevo Postulante'}
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {exito && <div className="alert alert-success">{exito}</div>}

            {mostrarForm && (
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-primary text-white">
                        {editando ? 'Editar Postulante' : 'Registrar Nuevo Postulante'}
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-md-3">
                                    <label className="form-label">CI *</label>
                                    <input name="ci" className="form-control" value={form.ci} onChange={handleChange} required />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Nombres *</label>
                                    <input name="nombres" className="form-control" value={form.nombres} onChange={handleChange} required />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Apellidos *</label>
                                    <input name="apellidos" className="form-control" value={form.apellidos} onChange={handleChange} required />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Fecha Nacimiento *</label>
                                    <input type="date" name="fecha_nac" className="form-control" value={form.fecha_nac} onChange={handleChange} required />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">Género *</label>
                                    <select name="genero" className="form-select" value={form.genero} onChange={handleChange}>
                                        <option value="M">Masculino</option>
                                        <option value="F">Femenino</option>
                                        <option value="O">Otro</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Teléfono</label>
                                    <input name="telefono" className="form-control" value={form.telefono} onChange={handleChange} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Correo *</label>
                                    <input type="email" name="correo" className="form-control" value={form.correo} onChange={handleChange} required />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Ciudad</label>
                                    <input name="ciudad" className="form-control" value={form.ciudad} onChange={handleChange} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Dirección</label>
                                    <input name="direccion" className="form-control" value={form.direccion} onChange={handleChange} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Colegio de Procedencia</label>
                                    <input name="colegio_procedencia" className="form-control" value={form.colegio_procedencia} onChange={handleChange} />
                                </div>

                                {!editando && (<>
                                    <div className="col-md-6">
                                        <label className="form-label">Carrera Opción 1 *</label>
                                        <select name="carrera_opcion1_id" className="form-select" value={form.carrera_opcion1_id} onChange={handleChange} required>
                                            <option value="">Seleccionar carrera...</option>
                                            {carreras.map(c => (
                                                <option key={c.id} value={c.id}>{c.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Carrera Opción 2 *</label>
                                        <select name="carrera_opcion2_id" className="form-select" value={form.carrera_opcion2_id} onChange={handleChange} required>
                                            <option value="">Seleccionar carrera...</option>
                                            {carreras.map(c => (
                                                <option key={c.id} value={c.id}
                                                    disabled={String(c.id) === String(form.carrera_opcion1_id)}>
                                                    {c.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>)}
                            </div>
                            <div className="mt-3">
                                <button type="submit" className="btn btn-success me-2">
                                    {editando ? 'Actualizar' : 'Registrar'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setMostrarForm(false)}>Cancelar</button>
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
                            <h6 className="card-title">Total Postulantes</h6>
                            <h2 className="fw-bold">{stats.total_postulantes}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-white bg-success h-100">
                        <div className="card-body">
                            <h6 className="card-title">Aprobados</h6>
                            <h2 className="fw-bold">{stats.aprobados}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-white bg-danger h-100">
                        <div className="card-body">
                            <h6 className="card-title">Reprobados</h6>
                            <h2 className="fw-bold">{stats.reprobados}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-white bg-warning h-100">
                        <div className="card-body">
                            <h6 className="card-title">En Proceso</h6>
                            <h2 className="fw-bold">{stats.en_proceso}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gráfico de ciudades */}
            {stats.ciudades.length > 0 && (
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-dark text-white">
                        <strong>Postulantes por ciudad</strong>
                        <span className="text-secondary ms-2 small fw-normal">Top 5</span>
                    </div>
                    <div className="card-body">
                        {(() => {
                            const max = Math.max(...stats.ciudades.map(c => Number(c.total)));
                            const total = typeof stats.total_postulantes === 'number' ? stats.total_postulantes : 1;
                            return stats.ciudades.map((c, i) => {
                                const pct = Math.round(Number(c.total) / total * 100);
                                const barW = Math.round(Number(c.total) / max * 100);
                                const colors = ['bg-primary','bg-info','bg-success','bg-warning','bg-danger'];
                                return (
                                    <div key={c.ciudad} className="mb-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="fw-semibold">{c.ciudad}</span>
                                            <span className="text-muted small">{c.total} postulantes ({pct}%)</span>
                                        </div>
                                        <div className="progress" style={{ height: '22px' }}>
                                            <div
                                                className={`progress-bar ${colors[i % colors.length]}`}
                                                style={{ width: `${barW}%`, transition: 'width .4s ease' }}
                                            >
                                                {pct > 10 ? `${pct}%` : ''}
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}

            {/* Buscador */}
            <div className="mb-3">
                <input className="form-control" placeholder="🔍 Buscar por CI, nombre o apellido..." value={busqueda} onChange={buscar} />
            </div>

            {/* Barra de reportes */}
            <div className="d-flex align-items-center justify-content-between mb-3 p-3 bg-light rounded border">
                <span className="fw-semibold text-secondary">
                    Postulantes registrados: <strong className="text-dark">{postulantes.length}</strong>
                </span>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-success btn-sm"
                        onClick={exportarCSV}
                        disabled={postulantes.length === 0}
                    >
                        ⬇ Exportar CSV
                    </button>
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={exportarPDF}
                        disabled={postulantes.length === 0}
                    >
                        ⬇ Exportar PDF
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className="card shadow-sm">
                <div className="card-header">
                    Total: <strong>{postulantes.length}</strong> postulantes
                </div>
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead className="table-dark">
                            <tr>
                                <th>#</th>
                                <th>CI</th>
                                <th>Nombres</th>
                                <th>Apellidos</th>
                                <th>Género</th>
                                <th>Teléfono</th>
                                <th>Correo</th>
                                <th>Ciudad</th>
                                <th>Grupo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {postulantes.length === 0 ? (
                                <tr><td colSpan="10" className="text-center text-muted py-4">No hay postulantes registrados</td></tr>
                            ) : (
                                postulantes.map((p, i) => (
                                    <tr key={p.id}>
                                        <td>{i + 1}</td>
                                        <td>{p.ci}</td>
                                        <td>{p.nombres}</td>
                                        <td>{p.apellidos}</td>
                                        <td>{p.genero === 'M' ? '♂ Masc.' : p.genero === 'F' ? '♀ Fem.' : 'Otro'}</td>
                                        <td>{p.telefono || '-'}</td>
                                        <td>{p.correo}</td>
                                        <td>{p.ciudad || '-'}</td>
                                        <td>
                                            {p.grupo_nombre
                                                ? <span className="badge bg-primary">{p.grupo_nombre}</span>
                                                : <span className="badge bg-secondary">Sin grupo</span>
                                            }
                                        </td>
                                        <td>
                                            <button className="btn btn-warning btn-sm me-1" onClick={() => editar(p)}>✏️</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => eliminar(p.id)}>🗑️</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Postulantes;