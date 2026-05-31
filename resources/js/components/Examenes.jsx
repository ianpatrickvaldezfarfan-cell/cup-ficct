import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MATERIAS_FB = ['Computacion', 'Matematicas', 'Ingles', 'Fisica'];

function NotaRow({ nota, onEditar }) {
    const aprobado = nota.estado_materia === 'APROBADO';
    return (
        <tr>
            <td>{nota.materia}</td>
            <td>{nota.nota1 ?? '-'}</td>
            <td>{nota.nota2 ?? '-'}</td>
            <td>{nota.nota3 ?? '-'}</td>
            <td className="fw-bold">{nota.nota_final ?? '-'}</td>
            <td>
                <span className={`badge ${aprobado ? 'bg-success' : 'bg-danger'}`}>
                    {nota.estado_materia}
                </span>
            </td>
            <td>
                <button className="btn btn-warning btn-sm" onClick={() => onEditar(nota)}>
                    Editar
                </button>
            </td>
        </tr>
    );
}

function FilaMateriaVacia({ materia, postulacionId, materiaId, onRegistrar }) {
    return (
        <tr className="table-light">
            <td>{materia}</td>
            <td colSpan={5} className="text-muted fst-italic">Sin notas registradas</td>
            <td>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onRegistrar(materia, postulacionId, materiaId)}
                >
                    Registrar
                </button>
            </td>
        </tr>
    );
}

/**
 * Modulo de gestion de examenes y notas del sistema CUP-FICCT.
 *
 * Busca postulantes por CI y muestra sus notas por materia.
 * Regla de evaluacion:
 * - Promedio por materia = (nota1 + nota2 + nota3) / 3
 * - Estado APROBADO si promedio >= 60 en TODAS las materias
 * - Estado REPROBADO si cualquier materia tiene promedio < 60
 * El estado de admision en postulaciones se actualiza automaticamente
 * en el backend al registrar o modificar notas.
 *
 * @param {Function} onBack Callback para volver al Dashboard
 * @param {Object}   user   Usuario autenticado (para header X-User-Id en bitacora)
 */
export default function Examenes({ onBack }) {
    const [materias, setMaterias] = useState([]);
    const [stats, setStats] = useState({
        total_postulantes: '-', con_notas_completas: '-', aprobados: '-', reprobados: '-',
    });
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
        fetch('/api/materias')
            .then(r => r.ok ? r.json() : [])
            .then(data => setMaterias(
                data.length ? data : MATERIAS_FB.map((n, i) => ({ id: i + 1, nombre: n }))
            ))
            .catch(() => setMaterias(MATERIAS_FB.map((n, i) => ({ id: i + 1, nombre: n }))));

        fetch('/api/examenes/estadisticas')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setStats(data); })
            .catch(() => {});

        fetch('/api/examenes/recientes')
            .then(r => r.ok ? r.json() : [])
            .then(data => setRecientes(data))
            .catch(() => {});
    }, []);

    const recargarStats = () => {
        fetch('/api/examenes/estadisticas').then(r => r.ok ? r.json() : null).then(d => { if (d) setStats(d); }).catch(() => {});
        fetch('/api/examenes/recientes').then(r => r.ok ? r.json() : []).then(d => setRecientes(d)).catch(() => {});
    };

    async function buscar() {
        const ciTrim = ci.trim();
        if (!ciTrim) return;
        setBuscando(true);
        setResultado(null);
        setNoEncontrado(false);
        setError('');
        try {
            const res = await fetch(`/api/examenes/postulante/${encodeURIComponent(ciTrim)}`);
            if (res.status === 404) { setNoEncontrado(true); return; }
            if (!res.ok) { setError('Error al buscar el postulante.'); return; }
            const data = await res.json();
            const notasMap = {};
            for (const nota of data.notas) notasMap[nota.materia] = nota;
            setResultado({
                postulacion_id: data.postulacion_id,
                ci:        data.postulante.ci,
                nombres:   data.postulante.nombres,
                apellidos: data.postulante.apellidos,
                notas:     notasMap,
            });
        } catch { setError('Error de conexión.'); }
        finally { setBuscando(false); }
    }

    const handleKeyDown = e => { if (e.key === 'Enter') buscar(); };

    const limpiarBusqueda = () => {
        setCi('');
        setResultado(null);
        setNoEncontrado(false);
        setError('');
    };

    function abrirRegistrar(materia, postulacionId, materiaId) {
        setForm({ nota1: '', nota2: '', nota3: '' });
        setFormError('');
        setModal({ modo: 'crear', materia, postulacionId, materiaId });
    }

    function abrirEditar(nota) {
        setForm({ nota1: nota.nota1, nota2: nota.nota2, nota3: nota.nota3 });
        setFormError('');
        setModal({ modo: 'editar', notaId: nota.id, materia: nota.materia });
    }

    function cerrarModal() { setModal(null); setFormError(''); }

    function cambiarForm(e) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    async function guardar() {
        const { nota1, nota2, nota3 } = form;
        if ([nota1, nota2, nota3].some(v => v === '' || isNaN(Number(v)) || Number(v) < 0 || Number(v) > 100)) {
            setFormError('Cada nota debe ser un número entre 0 y 100.');
            return;
        }
        setSaving(true);
        setFormError('');
        try {
            const res = modal.modo === 'crear'
                ? await fetch('/api/examenes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        postulacion_id: modal.postulacionId,
                        materia_id:     modal.materiaId,
                        nota1: Number(nota1), nota2: Number(nota2), nota3: Number(nota3),
                    }),
                })
                : await fetch(`/api/examenes/${modal.notaId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        nota1: Number(nota1), nota2: Number(nota2), nota3: Number(nota3),
                    }),
                });
            const data = await res.json();
            if (!res.ok) { setFormError(data.message || 'Error al guardar.'); return; }
            cerrarModal();
            buscar();        // Recargar notas del mismo postulante
            recargarStats(); // Actualizar estadísticas y recientes
        } catch { setFormError('Error de conexión.'); }
        finally { setSaving(false); }
    }

    const conNotas = resultado ? materias.filter(m => resultado.notas[m.nombre]) : [];
    const promedio = conNotas.length > 0
        ? conNotas.reduce((s, m) => s + Number(resultado.notas[m.nombre].nota_final || 0), 0) / conNotas.length
        : null;
    const tieneTodasMaterias = resultado ? conNotas.length === materias.length : false;

    // Materia(s) reprobadas individualmente
    const materiasReprobadas = conNotas.filter(m => Number(resultado.notas[m.nombre].nota_final) < 60);
    const algunaReprobada    = materiasReprobadas.length > 0;

    const estadoFinal = tieneTodasMaterias
        ? (!algunaReprobada && promedio >= 60 ? 'APROBADO' : 'REPROBADO')
        : 'EN PROCESO';

    const exportarCSV = () => {
        if (!resultado) return;
        const cabecera = ['Materia', 'Nota 1', 'Nota 2', 'Nota 3', 'Promedio', 'Estado'];
        const filas = materias.map(mat => {
            const nota = resultado.notas[mat.nombre];
            return [
                mat.nombre,
                nota?.nota1 ?? '-',
                nota?.nota2 ?? '-',
                nota?.nota3 ?? '-',
                nota?.nota_final != null ? Number(nota.nota_final).toFixed(2) : '-',
                nota?.estado_materia ?? '-',
            ];
        });
        if (promedio !== null) {
            filas.push(['PROMEDIO FINAL GLOBAL', '', '', '', promedio.toFixed(2), estadoFinal]);
        }
        const csv = [cabecera, ...filas]
            .map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const nombre = `notas_${resultado.ci}_${resultado.nombres}_${resultado.apellidos}`.replace(/\s+/g, '_');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `${nombre}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const exportarPDF = () => {
        if (!resultado) return;
        const doc   = new jsPDF();
        const fecha = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });

        doc.setFontSize(16);
        doc.setTextColor(13, 110, 253);
        doc.text('CUP-FICCT - Reporte de Notas', 14, 18);

        doc.setFontSize(11);
        doc.setTextColor(40);
        doc.text(`Postulante: ${resultado.nombres} ${resultado.apellidos}  —  CI: ${resultado.ci}`, 14, 27);

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Generado: ${fecha}`, 14, 34);

        // Filas de materias con colores por estado
        const COLOR_AP  = [212, 237, 218];
        const COLOR_REP = [248, 215, 218];
        const COLOR_VACIO = [255, 255, 255];

        const bodyRows = materias.map(mat => {
            const nota  = resultado.notas[mat.nombre];
            const color = nota?.estado_materia === 'APROBADO'  ? COLOR_AP
                        : nota?.estado_materia === 'REPROBADO' ? COLOR_REP
                        : COLOR_VACIO;
            const celdaEstilo = v => ({ content: v, styles: { fillColor: color } });
            return [
                celdaEstilo(mat.nombre),
                celdaEstilo(nota?.nota1 ?? '-'),
                celdaEstilo(nota?.nota2 ?? '-'),
                celdaEstilo(nota?.nota3 ?? '-'),
                { content: nota?.nota_final != null ? Number(nota.nota_final).toFixed(2) : '-', styles: { fillColor: color, fontStyle: 'bold' } },
                celdaEstilo(nota?.estado_materia ?? '-'),
            ];
        });

        // Fila resumen PROMEDIO FINAL GLOBAL
        if (promedio !== null) {
            const colorRes = estadoFinal === 'APROBADO' ? COLOR_AP : estadoFinal === 'REPROBADO' ? COLOR_REP : [255, 243, 205];
            const resEstilo = (v, bold = false) => ({
                content: v,
                styles: { fillColor: colorRes, fontStyle: bold ? 'bold' : 'normal' },
            });
            bodyRows.push([
                resEstilo('PROMEDIO FINAL GLOBAL', true),
                resEstilo('—'),
                resEstilo('—'),
                resEstilo('—'),
                resEstilo(promedio.toFixed(2), true),
                resEstilo(estadoFinal, true),
            ]);
        }

        autoTable(doc, {
            startY: 40,
            head: [['Materia', 'Nota 1', 'Nota 2', 'Nota 3', 'Promedio', 'Estado']],
            body: bodyRows,
            headStyles:  { fillColor: [13, 110, 253], fontSize: 9, fontStyle: 'bold' },
            bodyStyles:  { fontSize: 9 },
            columnStyles: { 4: { halign: 'center' }, 5: { halign: 'center' } },
        });

        const nombre = `notas_${resultado.ci}_${resultado.nombres}_${resultado.apellidos}`.replace(/\s+/g, '_');
        doc.save(`${nombre}.pdf`);
    };

    return (
        <div>
            <nav className="navbar navbar-dark bg-primary px-4">
                <span className="navbar-brand fw-bold">CUP - FICCT &mdash; Exámenes</span>
                <button className="btn btn-outline-light btn-sm" onClick={onBack}>
                    &larr; Volver al Dashboard
                </button>
            </nav>

            <div className="container-fluid p-4">
                <h4 className="mb-4">Registro de Notas por Examen</h4>

                {/* Tarjetas de estadísticas */}
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="card text-white bg-primary h-100">
                            <div className="card-body">
                                <h6 className="card-title">Total Postulantes</h6>
                                <h2 className="fw-bold">{stats.total_postulantes}</h2>
                                <small>Gestión {new Date().getFullYear()}</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-info h-100">
                            <div className="card-body">
                                <h6 className="card-title">Notas Completas</h6>
                                <h2 className="fw-bold">{stats.con_notas_completas}</h2>
                                <small>Con las 4 materias</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-success h-100">
                            <div className="card-body">
                                <h6 className="card-title">Aprobados</h6>
                                <h2 className="fw-bold">{stats.aprobados}</h2>
                                <small>Estado APROBADO</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-danger h-100">
                            <div className="card-body">
                                <h6 className="card-title">Reprobados</h6>
                                <h2 className="fw-bold">{stats.reprobados}</h2>
                                <small>Estado REPROBADO</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Últimas notas registradas */}
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-dark text-white">
                        <strong>Últimas notas registradas</strong>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover table-sm mb-0">
                            <thead className="table-secondary">
                                <tr>
                                    <th>CI</th>
                                    <th>Nombres</th>
                                    <th>Apellidos</th>
                                    <th>Materia</th>
                                    <th className="text-center">Promedio</th>
                                    <th className="text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recientes.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center text-muted py-3">
                                            No hay notas registradas aún.
                                        </td>
                                    </tr>
                                ) : recientes.map((r, i) => (
                                    <tr key={i}>
                                        <td className="fw-bold">{r.ci}</td>
                                        <td>{r.nombres}</td>
                                        <td>{r.apellidos}</td>
                                        <td>{r.materia}</td>
                                        <td className="text-center">
                                            {r.nota_final != null ? Number(r.nota_final).toFixed(2) : '-'}
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge ${r.estado_materia === 'APROBADO' ? 'bg-success' : 'bg-danger'}`}>
                                                {r.estado_materia}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Buscador */}
                <h5 className="mb-3">Buscar y registrar notas de un postulante</h5>
                <div className="card shadow-sm mb-4">
                    <div className="card-body">
                        <label className="form-label fw-bold">Buscar postulante por CI</label>
                        <div className="input-group input-group-lg">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Buscar por CI del postulante..."
                                value={ci}
                                onChange={e => {
                                    setCi(e.target.value);
                                    setResultado(null);
                                    setNoEncontrado(false);
                                    setError('');
                                }}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                            {ci && (
                                <button className="btn btn-outline-secondary" onClick={limpiarBusqueda} title="Limpiar">
                                    &times;
                                </button>
                            )}
                            <button
                                className="btn btn-primary px-4"
                                onClick={buscar}
                                disabled={buscando || !ci.trim()}
                            >
                                {buscando
                                    ? <><span className="spinner-border spinner-border-sm me-2" />Buscando...</>
                                    : 'Buscar'
                                }
                            </button>
                        </div>
                        <div className="form-text">Ingrese el CI exacto y presione <kbd>Enter</kbd> o haga clic en Buscar.</div>
                    </div>
                </div>

                {/* Mensajes */}
                {error && <div className="alert alert-danger">{error}</div>}
                {noEncontrado && (
                    <div className="alert alert-warning">
                        No se encontró ningún postulante con CI <strong>{ci}</strong>.
                    </div>
                )}
                {!resultado && !noEncontrado && !error && !buscando && (
                    <div className="text-center text-muted py-5">
                        <div style={{ fontSize: '3rem' }}>🔍</div>
                        <p className="mt-2">Ingrese el CI del postulante para ver y registrar sus notas.</p>
                    </div>
                )}

                {/* Botones de exportación — aparecen solo cuando hay resultado */}
                {resultado && (
                    <div className="d-flex justify-content-end gap-2 mb-2">
                        <button
                            className="btn btn-success btn-sm"
                            onClick={exportarCSV}
                            disabled={conNotas.length === 0}
                            title={conNotas.length === 0 ? 'Sin notas para exportar' : ''}
                        >
                            ⬇ Exportar CSV
                        </button>
                        <button
                            className="btn btn-danger btn-sm"
                            onClick={exportarPDF}
                            disabled={conNotas.length === 0}
                            title={conNotas.length === 0 ? 'Sin notas para exportar' : ''}
                        >
                            ⬇ Exportar PDF
                        </button>
                    </div>
                )}

                {/* Resultado */}
                {resultado && (
                    <div className="card shadow-sm">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <div>
                                <strong>{resultado.apellidos} {resultado.nombres}</strong>
                                <span className="badge bg-secondary ms-2">CI: {resultado.ci}</span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                {promedio !== null && (
                                    <span className="text-muted">
                                        Promedio global: <strong>{promedio.toFixed(2)}</strong>
                                    </span>
                                )}
                                <span className={`badge ${
                                    estadoFinal === 'APROBADO' ? 'bg-success' :
                                    estadoFinal === 'REPROBADO' ? 'bg-danger' : 'bg-secondary'
                                }`}>
                                    {estadoFinal}
                                </span>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-bordered table-hover mb-0">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>Materia</th>
                                            <th>Nota 1</th>
                                            <th>Nota 2</th>
                                            <th>Nota 3</th>
                                            <th>Promedio</th>
                                            <th>Estado</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {materias.map(mat => {
                                            const nota = resultado.notas[mat.nombre];
                                            return nota ? (
                                                <NotaRow key={mat.id} nota={nota} onEditar={abrirEditar} />
                                            ) : (
                                                <FilaMateriaVacia
                                                    key={mat.id}
                                                    materia={mat.nombre}
                                                    postulacionId={resultado.postulacion_id}
                                                    materiaId={mat.id}
                                                    onRegistrar={abrirRegistrar}
                                                />
                                            );
                                        })}
                                        {promedio !== null && (
                                            <tr className={`fw-bold ${
                                                tieneTodasMaterias
                                                    ? (estadoFinal === 'APROBADO' ? 'table-success' : 'table-danger')
                                                    : 'table-warning'
                                            }`}>
                                                <td>
                                                    PROMEDIO FINAL GLOBAL
                                                    {!tieneTodasMaterias && (
                                                        <span className="fw-normal text-muted ms-2 small">
                                                            ({conNotas.length}/{materias.length} materias)
                                                        </span>
                                                    )}
                                                    {tieneTodasMaterias && algunaReprobada && (
                                                        <div className="fw-normal text-danger small mt-1">
                                                            Reprobó: {materiasReprobadas.map(m => m.nombre).join(', ')}
                                                        </div>
                                                    )}
                                                    {tieneTodasMaterias && !algunaReprobada && promedio < 60 && (
                                                        <div className="fw-normal text-danger small mt-1">
                                                            Promedio global insuficiente
                                                        </div>
                                                    )}
                                                </td>
                                                <td>—</td>
                                                <td>—</td>
                                                <td>—</td>
                                                <td>{promedio.toFixed(2)}</td>
                                                <td>
                                                    <span className={`badge fs-6 px-3 py-2 ${
                                                        estadoFinal === 'APROBADO' ? 'bg-success' :
                                                        estadoFinal === 'REPROBADO' ? 'bg-danger' : 'bg-warning text-dark'
                                                    }`}>
                                                        {estadoFinal}
                                                    </span>
                                                </td>
                                                <td></td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modal && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {modal.modo === 'crear' ? 'Registrar' : 'Editar'} Notas &mdash; {modal.materia}
                                </h5>
                                <button type="button" className="btn-close" onClick={cerrarModal} />
                            </div>
                            <div className="modal-body">
                                {formError && <div className="alert alert-danger py-2">{formError}</div>}
                                <p className="text-muted small mb-3">
                                    Cada nota entre 0 y 100. Promedio = (nota1 + nota2 + nota3) / 3.
                                    Se aprueba con promedio &ge; 60.
                                </p>
                                {['nota1', 'nota2', 'nota3'].map((campo, i) => (
                                    <div className="mb-3" key={campo}>
                                        <label className="form-label">Nota {i + 1}</label>
                                        <input
                                            type="number"
                                            name={campo}
                                            className="form-control"
                                            min="0" max="100" step="0.01"
                                            value={form[campo]}
                                            onChange={cambiarForm}
                                            placeholder="0 - 100"
                                        />
                                    </div>
                                ))}
                                {form.nota1 !== '' && form.nota2 !== '' && form.nota3 !== '' && (() => {
                                    const prom = (Number(form.nota1) + Number(form.nota2) + Number(form.nota3)) / 3;
                                    return (
                                        <div className="alert alert-info py-2">
                                            Promedio final: <strong>{prom.toFixed(2)}</strong>
                                            &nbsp;&mdash;&nbsp;
                                            <span className={`badge ${prom >= 60 ? 'bg-success' : 'bg-danger'}`}>
                                                {prom >= 60 ? 'APROBADO' : 'REPROBADO'}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={cerrarModal}>Cancelar</button>
                                <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
