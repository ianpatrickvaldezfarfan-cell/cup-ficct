import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Panel de consulta de la Bitacora del sistema (CU14 - Administrador).
 *
 * Este componente tiene DOS flujos de uso:
 * 1) Consulta manual: el administrador filtra y visualiza registros de auditoria
 * 2) Registro automatico: BitacoraService (backend) inserta entradas en cada
 *    operacion de escritura de los demas modulos, transparente al usuario
 *
 * Los registros se identifican por accion (INSERT/UPDATE/DELETE/LOGIN/LOGOUT)
 * y tabla afectada. Se muestran los ultimos 100 registros (o filtrados).
 *
 * Los filtros son acumulativos: turno activo + texto de busqueda se combinan.
 * La exportacion CSV incluye BOM UTF-8 para correcta apertura en Excel.
 * La exportacion PDF usa orientacion horizontal (landscape) por la cantidad de columnas.
 *
 * @param {Function} onBack Callback para volver al Dashboard
 */

// Tipos de acciones registradas en la bitacora
const ACCIONES = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
const TABLAS   = ['postulantes', 'docentes', 'notas', 'grupos', 'usuarios'];

function AccionBadge({ accion }) {
    const cfg = {
        INSERT: { cls: 'bg-success',         label: 'INSERT'  },
        UPDATE: { cls: 'bg-warning text-dark',label: 'UPDATE'  },
        DELETE: { cls: 'bg-danger',           label: 'DELETE'  },
        LOGIN:  { cls: 'bg-primary',          label: 'LOGIN'   },
        LOGOUT: { cls: 'bg-secondary',        label: 'LOGOUT'  },
    };
    const { cls, label } = cfg[accion] ?? { cls: 'bg-light text-dark', label: accion };
    return <span className={`badge ${cls}`}>{label}</span>;
}

const FILTROS_VACIOS = { accion: '', tabla_afectada: '', fecha_desde: '', fecha_hasta: '' };

export default function Bitacora({ onBack }) {
    const [registros, setRegistros]   = useState([]);
    const [loading, setLoading]       = useState(true);
    const [stats, setStats]           = useState({
        total_registros: 0, registros_hoy: 0,
        acciones_por_tipo: {}, tablas_mas_afectadas: [],
    });
    const [filtros, setFiltros]       = useState(FILTROS_VACIOS);
    const [filtrosAplicados, setFiltrosAplicados] = useState(false);
    const [error, setError]           = useState('');

    useEffect(() => {
        cargarStats();
        cargar();
    }, []);

    async function cargarStats() {
        try {
            const res  = await fetch('/api/bitacora/estadisticas');
            const data = await res.json();
            setStats(data);
        } catch { /* silent */ }
    }

    async function cargar() {
        setLoading(true);
        setError('');
        try {
            const res  = await fetch('/api/bitacora');
            const data = await res.json();
            setRegistros(data);
        } catch {
            setError('Error al cargar bitácora.');
        } finally {
            setLoading(false);
        }
    }

    async function filtrar() {
        setLoading(true);
        setError('');
        const params = new URLSearchParams();
        Object.entries(filtros).forEach(([k, v]) => { if (v) params.append(k, v); });
        try {
            const res  = await fetch(`/api/bitacora/filtrar?${params}`);
            const data = await res.json();
            setRegistros(data);
            setFiltrosAplicados(true);
        } catch {
            setError('Error al filtrar.');
        } finally {
            setLoading(false);
        }
    }

    function limpiar() {
        setFiltros(FILTROS_VACIOS);
        setFiltrosAplicados(false);
        cargar();
    }

    const set = (k, v) => setFiltros(f => ({ ...f, [k]: v }));

    function formatFecha(dt) {
        if (!dt) return '—';
        const d = new Date(dt);
        return d.toLocaleDateString('es-BO') + ' ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    const exportarCSV = () => {
        const cab  = ['#', 'Usuario', 'Rol', 'Acción', 'Tabla', 'Descripción', 'Fecha/Hora', 'IP'];
        const filas = registros.map((r, i) => [
            i + 1, r.username ?? 'Sistema', r.rol ?? '—',
            r.accion, r.tabla_afectada ?? '—', r.descripcion,
            formatFecha(r.fecha_hora), r.direccion_ip ?? '—',
        ]);
        const csv  = [cab, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const a    = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'bitacora.csv'; a.click();
        URL.revokeObjectURL(a.href);
    };

    const exportarPDF = () => {
        const doc   = new jsPDF('landscape');
        const fecha = new Date().toLocaleDateString('es-BO');
        doc.setFontSize(14); doc.setTextColor(13, 110, 253);
        doc.text('CUP-FICCT - Bitácora del Sistema', 14, 15);
        doc.setFontSize(9);  doc.setTextColor(100);
        doc.text(`${registros.length} registros | Generado: ${fecha}`, 14, 22);
        autoTable(doc, {
            startY: 27,
            head: [['#', 'Usuario', 'Acción', 'Tabla', 'Descripción', 'Fecha/Hora', 'IP']],
            body: registros.map((r, i) => [
                i + 1, r.username ?? 'Sistema',
                r.accion, r.tabla_afectada ?? '—',
                r.descripcion?.slice(0, 50),
                formatFecha(r.fecha_hora), r.direccion_ip ?? '—',
            ]),
            headStyles:  { fillColor: [13, 110, 253], fontSize: 7 },
            bodyStyles:  { fontSize: 7 },
            columnStyles: { 4: { cellWidth: 60 } },
        });
        doc.save('bitacora.pdf');
    };

    const { total_registros, registros_hoy, acciones_por_tipo } = stats;
    const inserciones   = (acciones_por_tipo?.INSERT ?? 0);
    const modificaciones = (acciones_por_tipo?.UPDATE ?? 0) + (acciones_por_tipo?.DELETE ?? 0);

    return (
        <div>
            <nav className="navbar navbar-dark bg-primary px-4">
                <span className="navbar-brand fw-bold">CUP - FICCT &mdash; Bitácora</span>
                <button className="btn btn-outline-light btn-sm" onClick={onBack}>&larr; Volver al Dashboard</button>
            </nav>

            <div className="container-fluid p-4">
                <h4 className="mb-4">Historial de Auditoría del Sistema</h4>

                {/* Estadísticas */}
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total Registros',      val: total_registros, color: '#0d6efd' },
                        { label: 'Registros Hoy',        val: registros_hoy,   color: '#198754' },
                        { label: 'Inserciones',          val: inserciones,     color: '#6f42c1' },
                        { label: 'Modif. / Eliminaciones', val: modificaciones, color: '#fd7e14' },
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

                {error && <div className="alert alert-danger py-2 small">{error}</div>}

                {/* Filtros */}
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-secondary text-white py-2">
                        <h6 className="mb-0 fw-bold">Filtros</h6>
                    </div>
                    <div className="card-body">
                        <div className="row g-2 align-items-end">
                            <div className="col-md-2">
                                <label className="form-label small fw-semibold">Acción</label>
                                <select className="form-select form-select-sm" value={filtros.accion} onChange={e => set('accion', e.target.value)}>
                                    <option value="">Todos</option>
                                    {ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small fw-semibold">Tabla</label>
                                <select className="form-select form-select-sm" value={filtros.tabla_afectada} onChange={e => set('tabla_afectada', e.target.value)}>
                                    <option value="">Todas</option>
                                    {TABLAS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small fw-semibold">Fecha desde</label>
                                <input type="date" className="form-control form-control-sm" value={filtros.fecha_desde} onChange={e => set('fecha_desde', e.target.value)} />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small fw-semibold">Fecha hasta</label>
                                <input type="date" className="form-control form-control-sm" value={filtros.fecha_hasta} onChange={e => set('fecha_hasta', e.target.value)} />
                            </div>
                            <div className="col-md-4 d-flex gap-2">
                                <button className="btn btn-primary btn-sm" onClick={filtrar}>Filtrar</button>
                                <button className="btn btn-outline-secondary btn-sm" onClick={limpiar} disabled={!filtrosAplicados}>
                                    Limpiar filtros
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabla */}
                <div className="card shadow-sm">
                    <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Registros</strong>
                            <span className="text-secondary ms-2 small fw-normal">
                                Mostrando {registros.length} registro{registros.length !== 1 ? 's' : ''}
                                {filtrosAplicados && <span className="ms-1 text-warning">(filtrados)</span>}
                            </span>
                        </div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-success btn-sm" onClick={exportarCSV} disabled={!registros.length}>⬇ CSV</button>
                            <button className="btn btn-danger  btn-sm" onClick={exportarPDF} disabled={!registros.length}>⬇ PDF</button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover table-sm mb-0">
                                <thead className="table-secondary">
                                    <tr>
                                        <th>#</th>
                                        <th>Usuario</th>
                                        <th>Rol</th>
                                        <th>Acción</th>
                                        <th>Tabla Afectada</th>
                                        <th>Descripción</th>
                                        <th>Fecha y Hora</th>
                                        <th>IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registros.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center text-muted py-4">
                                                No hay registros en la bitácora.
                                            </td>
                                        </tr>
                                    ) : registros.map((r, i) => (
                                        <tr key={r.id}>
                                            <td className="text-muted small">{i + 1}</td>
                                            <td className="fw-semibold small">{r.username ?? <span className="text-muted">Sistema</span>}</td>
                                            <td className="small text-muted">{r.rol ?? '—'}</td>
                                            <td><AccionBadge accion={r.accion} /></td>
                                            <td className="small">
                                                {r.tabla_afectada
                                                    ? <code className="bg-light px-1 rounded">{r.tabla_afectada}</code>
                                                    : <span className="text-muted">—</span>
                                                }
                                            </td>
                                            <td className="small" style={{ maxWidth: 320 }}>{r.descripcion}</td>
                                            <td className="small text-muted" style={{ whiteSpace: 'nowrap' }}>
                                                {formatFecha(r.fecha_hora)}
                                            </td>
                                            <td className="small text-muted">{r.direccion_ip ?? '—'}</td>
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
