import React, { useState, useEffect } from 'react';

const ESTADOS = ['EN PROCESO', 'APROBADO', 'REPROBADO', 'PENDIENTE_PAGO'];

function EstadoBadge({ estado }) {
    const cfg = {
        'EN PROCESO':    { cls: 'bg-primary',   label: 'En Proceso'   },
        'APROBADO':      { cls: 'bg-success',   label: 'Aprobado'     },
        'REPROBADO':     { cls: 'bg-danger',    label: 'Reprobado'    },
        'PENDIENTE_PAGO':{ cls: 'bg-warning text-dark', label: 'Pago Pendiente' },
    };
    const { cls, label } = cfg[estado] ?? { cls: 'bg-secondary', label: estado };
    return <span className={`badge ${cls}`}>{label}</span>;
}

export default function Postulaciones({ onBack }) {
    const [postulaciones, setPostulaciones] = useState([]);
    const [loading, setLoading]             = useState(true);
    const [busqueda, setBusqueda]           = useState('');
    const [filtroEstado, setFiltroEstado]   = useState('todos');
    const [actualizando, setActualizando]   = useState(null); // id en proceso
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

    // Filtrado combinado: texto + estado
    const filtradas = postulaciones.filter(p => {
        const q = busqueda.toLowerCase();
        const matchTexto = !q
            || (p.ci        || '').toLowerCase().includes(q)
            || (p.nombres   || '').toLowerCase().includes(q)
            || (p.apellidos || '').toLowerCase().includes(q)
            || (p.carrera_asignada || '').toLowerCase().includes(q);
        const matchEstado = filtroEstado === 'todos' || p.estado_admision === filtroEstado;
        return matchTexto && matchEstado;
    });

    // Contadores por estado
    const contadores = ESTADOS.reduce((acc, e) => {
        acc[e] = postulaciones.filter(p => p.estado_admision === e).length;
        return acc;
    }, {});

    const badgeCfg = {
        'todos':         { cls: 'btn-outline-secondary', label: `Todos (${postulaciones.length})` },
        'EN PROCESO':    { cls: 'btn-outline-primary',   label: `En Proceso (${contadores['EN PROCESO'] ?? 0})` },
        'APROBADO':      { cls: 'btn-outline-success',   label: `Aprobado (${contadores['APROBADO'] ?? 0})` },
        'REPROBADO':     { cls: 'btn-outline-danger',    label: `Reprobado (${contadores['REPROBADO'] ?? 0})` },
        'PENDIENTE_PAGO':{ cls: 'btn-outline-warning',   label: `Pago Pendiente (${contadores['PENDIENTE_PAGO'] ?? 0})` },
    };

    return (
        <div>
            <nav className="navbar navbar-dark bg-primary px-4">
                <span className="navbar-brand fw-bold">CUP - FICCT &mdash; Postulaciones</span>
                <button className="btn btn-outline-light btn-sm" onClick={onBack}>
                    &larr; Volver al Dashboard
                </button>
            </nav>

            <div className="container-fluid p-4">
                <h4 className="mb-4">Gestión de Postulaciones</h4>

                {/* Tarjetas resumen */}
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total',         val: postulaciones.length,               cls: 'bg-primary'  },
                        { label: 'En Proceso',    val: contadores['EN PROCESO']    ?? 0,   cls: 'bg-info'     },
                        { label: 'Aprobados',     val: contadores['APROBADO']      ?? 0,   cls: 'bg-success'  },
                        { label: 'Reprobados',    val: contadores['REPROBADO']     ?? 0,   cls: 'bg-danger'   },
                        { label: 'Pago Pendiente',val: contadores['PENDIENTE_PAGO'] ?? 0,  cls: 'bg-warning'  },
                    ].map(({ label, val, cls }) => (
                        <div key={label} className="col-md">
                            <div className={`card text-white ${cls} h-100`}>
                                <div className="card-body py-2 px-3">
                                    <div className="small">{label}</div>
                                    <div className="fw-bold fs-4">{val}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {mensaje && <div className="alert alert-success py-2 small">{mensaje}</div>}
                {error   && <div className="alert alert-danger  py-2 small">{error}</div>}

                <div className="card shadow-sm">
                    <div className="card-header bg-dark text-white">
                        {/* Buscador */}
                        <div className="mb-2">
                            <div className="input-group input-group-sm">
                                <input
                                    type="text"
                                    className="form-control bg-secondary border-0 text-white"
                                    placeholder="🔍 Buscar por CI, nombre, apellido o carrera..."
                                    value={busqueda}
                                    onChange={e => setBusqueda(e.target.value)}
                                />
                                {busqueda && (
                                    <button className="btn btn-secondary border-0" onClick={() => setBusqueda('')}>✕</button>
                                )}
                            </div>
                        </div>

                        {/* Filtros de estado + contador */}
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <div className="d-flex flex-wrap gap-1">
                                {['todos', ...ESTADOS].map(e => (
                                    <button
                                        key={e}
                                        className={`btn btn-sm ${badgeCfg[e].cls} ${filtroEstado === e ? 'active' : 'opacity-75'}`}
                                        onClick={() => setFiltroEstado(e)}
                                    >
                                        {badgeCfg[e].label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-secondary small">
                                Mostrando <strong className="text-white">{filtradas.length}</strong> de {postulaciones.length}
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" />
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-secondary">
                                    <tr>
                                        <th>#</th>
                                        <th>CI</th>
                                        <th>Nombres</th>
                                        <th>Apellidos</th>
                                        <th>Carrera Asignada</th>
                                        <th className="text-center">Gestión</th>
                                        <th>Estado</th>
                                        <th>Cambiar Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtradas.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center text-muted py-4">
                                                No hay postulaciones que coincidan con los filtros.
                                            </td>
                                        </tr>
                                    ) : filtradas.map((p, i) => (
                                        <tr key={p.id}>
                                            <td className="text-muted small">{i + 1}</td>
                                            <td className="fw-semibold">{p.ci}</td>
                                            <td>{p.nombres}</td>
                                            <td>{p.apellidos}</td>
                                            <td className="small text-muted">{p.carrera_asignada ?? '—'}</td>
                                            <td className="text-center">
                                                <span className="badge bg-secondary">{p.gestion}</span>
                                            </td>
                                            <td><EstadoBadge estado={p.estado_admision} /></td>
                                            <td>
                                                <select
                                                    className="form-select form-select-sm"
                                                    style={{ minWidth: 140 }}
                                                    value={p.estado_admision}
                                                    disabled={actualizando === p.id}
                                                    onChange={e => cambiarEstado(p.id, e.target.value)}
                                                >
                                                    {ESTADOS.map(e => (
                                                        <option key={e} value={e}>{e}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
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
