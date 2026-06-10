import React, { useState, useEffect } from 'react';
import ModalCambiarPassword from './ModalCambiarPassword';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estadoBadge(estado, grande = false) {
    const mapa = {
        'APROBADO':       { bg: '#dcfce7', color: '#15803d', texto: '🎉 APROBADO' },
        'REPROBADO':      { bg: '#fee2e2', color: '#dc2626', texto: 'REPROBADO' },
        'EN PROCESO':     { bg: '#dbeafe', color: '#1d4ed8', texto: 'EN PROCESO' },
        'PENDIENTE_PAGO': { bg: '#fef9c3', color: '#b45309', texto: 'PAGO PENDIENTE' },
    };
    const s = mapa[estado] || { bg: '#f1f5f9', color: '#64748b', texto: estado || 'Sin estado' };
    return (
        <span style={{
            background: s.bg, color: s.color, borderRadius: 8,
            padding: grande ? '6px 18px' : '3px 10px',
            fontSize: grande ? 15 : 12, fontWeight: 700, display: 'inline-block',
        }}>
            {s.texto}
        </span>
    );
}

function Spinner() {
    return (
        <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner-border" style={{ color: '#1a3a6b', width: 40, height: 40 }} role="status" />
        </div>
    );
}

function Volver({ onVolver, titulo }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={onVolver} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#64748b', fontSize: 13 }}>
                ← Volver a mi panel
            </button>
            <h5 style={{ margin: 0, color: '#1a3a6b', fontWeight: 700, fontSize: 18 }}>{titulo}</h5>
        </div>
    );
}

const thStyle = { backgroundColor: '#1a3a6b', color: '#fff', fontWeight: 600, fontSize: 13, padding: '10px 14px', whiteSpace: 'nowrap' };
const tdStyle = { padding: '10px 14px', fontSize: 13, verticalAlign: 'middle' };

function BotonesExportar({ onCSV, onPDF }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
            <button
                onClick={onCSV}
                style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
            >
                ⬇ CSV
            </button>
            <button
                onClick={onPDF}
                style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
            >
                ⬇ PDF
            </button>
        </div>
    );
}

// ─── Secciones ────────────────────────────────────────────────────────────────

function SeccionDatos({ userId, onVolver }) {
    const [datos, setDatos]   = useState(null);
    const [form, setForm]     = useState({});
    const [msg, setMsg]       = useState(null);
    const [saving, setSaving] = useState(false);
    const [modalPwd, setModalPwd] = useState(false);

    useEffect(() => {
        fetch('/api/postulante/mis-datos', { headers: { 'Accept': 'application/json', 'X-User-Id': userId } })
            .then(r => r.json()).then(d => { setDatos(d); setForm(d); }).catch(() => {});
    }, []);

    async function guardar(e) {
        e.preventDefault();
        setSaving(true); setMsg(null);
        try {
            const res = await fetch('/api/postulante/mis-datos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-User-Id': userId },
                body: JSON.stringify({ nombres: form.nombres, apellidos: form.apellidos, telefono: form.telefono, correo: form.correo, direccion: form.direccion, ciudad: form.ciudad }),
            });
            const data = await res.json();
            setMsg({ ok: res.ok, texto: data.message || (res.ok ? 'Guardado' : 'Error') });
            if (res.ok) setDatos({ ...datos, ...form });
        } catch { setMsg({ ok: false, texto: 'Error de conexión' }); }
        finally { setSaving(false); }
    }

    const exportarDatosCSV = () => {
        if (!datos) return;
        try {
            const headers = ['CI', 'Nombres', 'Apellidos', 'Fecha Nacimiento', 'Género', 'Teléfono', 'Correo', 'Dirección', 'Ciudad', 'Colegio Procedencia'];
            const fila = [
                datos.ci || '', datos.nombres || '', datos.apellidos || '',
                datos.fecha_nac || '', datos.genero || '', datos.telefono || '',
                datos.correo || '', datos.direccion || '', datos.ciudad || '',
                datos.colegio_procedencia || '',
            ];
            const csv = '﻿' + headers.join(',') + '\n' +
                fila.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = 'mis_datos_personales.csv'; link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generando CSV:', error);
            alert('Error al generar el CSV. Intenta de nuevo.');
        }
    };

    const exportarDatosPDF = () => {
        if (!datos) return;
        try {
            const doc = new jsPDF();
            doc.setFontSize(16); doc.setTextColor(26, 58, 107);
            doc.text('CUP-FICCT - Mis Datos Personales', 14, 15);
            doc.setFontSize(10); doc.setTextColor(100, 116, 139);
            doc.text('Generado: ' + new Date().toLocaleDateString('es-BO'), 14, 22);
            autoTable(doc, {
                startY: 30,
                head: [['Campo', 'Valor']],
                body: [
                    ['CI', datos.ci || ''],
                    ['Nombres', datos.nombres || ''],
                    ['Apellidos', datos.apellidos || ''],
                    ['Fecha Nacimiento', datos.fecha_nac || ''],
                    ['Género', datos.genero || ''],
                    ['Teléfono', datos.telefono || ''],
                    ['Correo', datos.correo || ''],
                    ['Dirección', datos.direccion || ''],
                    ['Ciudad', datos.ciudad || ''],
                    ['Colegio', datos.colegio_procedencia || ''],
                ],
                headStyles: { fillColor: [26, 58, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 9 },
            });
            doc.save('mis_datos_personales.pdf');
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el PDF. Intenta de nuevo.');
        }
    };

    const campo = (label, key, editable = true, tipo = 'text') => (
        <div className="col-md-6 mb-3" key={key}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
                {label}
            </label>
            <input
                type={tipo}
                className="form-control"
                value={form[key] ?? ''}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                disabled={!editable}
                style={{ borderRadius: 8, fontSize: 14, borderColor: editable ? '#e2e8f0' : '#f1f5f9', background: editable ? '#fff' : '#f8fafc', height: 40 }}
            />
        </div>
    );

    if (!datos) return <Spinner />;
    return (
        <div>
            <Volver onVolver={onVolver} titulo="Mis Datos Personales" />
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '24px 28px', maxWidth: 760 }}>
                <BotonesExportar onCSV={exportarDatosCSV} onPDF={exportarDatosPDF} />
                <form onSubmit={guardar}>
                    <div className="row">
                        {campo('CI (no modificable)', 'ci', false)}
                        {campo('Fecha de Nacimiento', 'fecha_nac', false, 'date')}
                        {campo('Nombres *', 'nombres')}
                        {campo('Apellidos *', 'apellidos')}
                        {campo('Correo *', 'correo', true, 'email')}
                        {campo('Teléfono', 'telefono')}
                        {campo('Dirección', 'direccion')}
                        {campo('Ciudad', 'ciudad')}
                        {campo('Colegio (no modificable)', 'colegio_procedencia', false)}
                        {campo('Género (no modificable)', 'genero', false)}
                    </div>
                    {msg && (
                        <div style={{ background: msg.ok ? '#d1fae5' : '#fee2e2', color: msg.ok ? '#065f46' : '#991b1b', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 13 }}>
                            {msg.texto}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button type="submit" disabled={saving} style={{ background: '#f59e0b', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, color: '#1a3a6b', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                            {saving ? 'Guardando...' : '💾 Guardar cambios'}
                        </button>
                        <button type="button" onClick={() => setModalPwd(true)} style={{ background: 'transparent', border: '2px solid #2563eb', borderRadius: 8, padding: '9px 20px', fontWeight: 700, color: '#2563eb', cursor: 'pointer', fontSize: 14 }}>
                            🔒 Cambiar Contraseña
                        </button>
                    </div>
                </form>
            </div>
            {modalPwd && <ModalCambiarPassword userId={userId} onClose={() => setModalPwd(false)} />}
        </div>
    );
}

function SeccionPostulacion({ userId, onVolver }) {
    const [data, setData] = useState(null);
    const [err, setErr]   = useState(false);

    useEffect(() => {
        fetch('/api/postulante/mi-postulacion', { headers: { 'Accept': 'application/json', 'X-User-Id': userId } })
            .then(r => r.ok ? r.json() : null).then(d => { if (d) setData(d); else setErr(true); }).catch(() => setErr(true));
    }, []);

    const exportarPostulacionCSV = () => {
        if (!data) return;
        try {
            const headers = ['Gestión', 'Carrera Opción 1', 'Carrera Opción 2', 'Carrera Asignada', 'Estado Admisión', 'Turno Preferido'];
            const fila = [
                data.gestion || '', data.carrera_opcion1 || '', data.carrera_opcion2 || '',
                data.carrera_asignada || '', data.estado_admision || '', data.turno_preferido || '',
            ];
            const csv = '﻿' + headers.join(',') + '\n' +
                fila.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = 'mi_postulacion.csv'; link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generando CSV:', error);
            alert('Error al generar el CSV. Intenta de nuevo.');
        }
    };

    const exportarPostulacionPDF = () => {
        if (!data) return;
        try {
            const doc = new jsPDF();
            doc.setFontSize(16); doc.setTextColor(26, 58, 107);
            doc.text('CUP-FICCT - Mi Postulación', 14, 15);
            doc.setFontSize(10); doc.setTextColor(100, 116, 139);
            doc.text('Generado: ' + new Date().toLocaleDateString('es-BO'), 14, 22);
            autoTable(doc, {
                startY: 30,
                head: [['Campo', 'Valor']],
                body: [
                    ['Gestión', data.gestion || ''],
                    ['Carrera Opcion 1', data.carrera_opcion1 || ''],
                    ['Carrera Opcion 2', data.carrera_opcion2 || ''],
                    ['Carrera Asignada', data.carrera_asignada || ''],
                    ['Estado Admision', data.estado_admision || ''],
                    ['Turno Preferido', data.turno_preferido || ''],
                ],
                headStyles: { fillColor: [26, 58, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 9 },
            });
            doc.save('mi_postulacion.pdf');
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el PDF. Intenta de nuevo.');
        }
    };

    const Fila = ({ label, valor, badge }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{badge ? estadoBadge(valor) : (valor || '—')}</span>
        </div>
    );

    if (!data && !err) return <Spinner />;
    return (
        <div>
            <Volver onVolver={onVolver} titulo="Mi Postulación" />
            {err ? (
                <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94a3b8' }}>Sin postulación registrada.</div>
            ) : (
                <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '24px 28px', maxWidth: 620 }}>
                    <BotonesExportar onCSV={exportarPostulacionCSV} onPDF={exportarPostulacionPDF} />
                    <Fila label="Gestión" valor={data.gestion} />
                    <Fila label="Carrera Opción 1" valor={data.carrera_opcion1} />
                    <Fila label="Carrera Opción 2" valor={data.carrera_opcion2} />
                    <Fila label="Carrera Asignada" valor={data.carrera_asignada} />
                    <Fila label="Estado de Admisión" valor={data.estado_admision} badge />
                    <div style={{ marginTop: 20, background: '#f8fafc', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#64748b', borderLeft: '3px solid #f59e0b' }}>
                        No puedes modificar tu postulación. Para consultas comunícate con administración.
                    </div>
                </div>
            )}
        </div>
    );
}

function SeccionDocumentos({ userId, onVolver }) {
    const [data, setData]     = useState(null);
    const [subiendo, setSubiendo] = useState(false);
    const [msg, setMsg]       = useState(null);
    const [files, setFiles]   = useState({});
    const [showForm, setShowForm] = useState(false);

    function cargar() {
        fetch('/api/postulante/mis-documentos', { headers: { 'Accept': 'application/json', 'X-User-Id': userId } })
            .then(r => r.json()).then(d => setData(d)).catch(() => {});
    }
    useEffect(() => { cargar(); }, []);

    const exportarDocumentosCSV = () => {
        const docs = data?.documentos ?? [];
        if (docs.length === 0) return;
        try {
            const headers = ['Tipo Documento', 'Estado', 'URL'];
            const filas = docs.map(doc => [
                doc.tipo || '',
                doc.url ? 'Entregado' : 'Pendiente',
                doc.url || 'Sin documento',
            ]);
            const csv = '﻿' + headers.join(',') + '\n' +
                filas.map(f => f.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = 'mis_documentos.csv'; link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generando CSV:', error);
            alert('Error al generar el CSV. Intenta de nuevo.');
        }
    };

    const exportarDocumentosPDF = () => {
        const docs = data?.documentos ?? [];
        if (docs.length === 0) return;
        try {
            const doc = new jsPDF();
            doc.setFontSize(16); doc.setTextColor(26, 58, 107);
            doc.text('CUP-FICCT - Mis Documentos', 14, 15);
            doc.setFontSize(10); doc.setTextColor(100, 116, 139);
            doc.text('Generado: ' + new Date().toLocaleDateString('es-BO'), 14, 22);
            autoTable(doc, {
                startY: 30,
                head: [['Tipo Documento', 'Estado']],
                body: docs.map(d => [d.tipo || '', d.url ? 'Entregado' : 'Pendiente']),
                headStyles: { fillColor: [26, 58, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 9 },
                didParseCell: function(data) {
                    if (data.column.index === 1) {
                        if (data.cell.raw === 'Entregado') {
                            data.cell.styles.textColor = [22, 163, 74];
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [220, 38, 38];
                        }
                    }
                },
            });
            doc.save('mis_documentos.pdf');
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el PDF. Intenta de nuevo.');
        }
    };

    async function subirDocs(e) {
        e.preventDefault();
        setSubiendo(true); setMsg(null);
        const fd = new FormData();
        fd.append('postulacion_id', data?.postulacion_id ?? '');
        Object.entries(files).forEach(([key, file]) => { if (file) fd.append(key, file); });
        try {
            const res = await fetch('/api/registro/paso1b', { method: 'POST', headers: { 'Accept': 'application/json', 'X-User-Id': userId }, body: fd });
            const resp = await res.json();
            setMsg({ ok: res.ok, texto: resp.mensaje || (res.ok ? 'Documentos subidos' : 'Error') });
            if (res.ok) { cargar(); setShowForm(false); setFiles({}); }
        } catch { setMsg({ ok: false, texto: 'Error de conexión' }); }
        finally { setSubiendo(false); }
    }

    if (!data) return <Spinner />;
    const hayPendientes = (data.documentos ?? []).some(doc => !doc.url || doc.url.trim() === '');

    return (
        <div>
            <Volver onVolver={onVolver} titulo="Mis Documentos" />
            <BotonesExportar onCSV={exportarDocumentosCSV} onPDF={exportarDocumentosPDF} />
            <div className="row g-3 mb-4">
                {(data.documentos ?? []).map((doc, idx) => {
                    const entregado = !!(doc.url && doc.url.trim() !== '');
                    return (
                        <div className="col-md-6" key={idx}>
                            <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${entregado ? '#16a34a' : '#dc2626'}` }}>
                                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 8, fontSize: 14 }}>{doc.tipo}</div>
                                {entregado ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>✓ Entregado</span>
                                        <a href={'/' + doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>Ver documento</a>
                                    </div>
                                ) : (
                                    <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>✗ Pendiente</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {hayPendientes && !showForm && (
                <button onClick={() => setShowForm(true)} style={{ background: '#f59e0b', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, color: '#1a3a6b', cursor: 'pointer', fontSize: 14 }}>
                    📤 Subir documentos pendientes
                </button>
            )}

            {showForm && (
                <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', maxWidth: 600 }}>
                    <h6 style={{ color: '#1a3a6b', fontWeight: 700, marginBottom: 16 }}>Subir documentos (PDF, JPG, PNG — máx 5MB c/u)</h6>
                    <form onSubmit={subirDocs}>
                        {(data.documentos ?? []).filter(doc => !doc.url || doc.url.trim() === '').map((doc, idx) => {
                            const key = `documento_${idx}`;
                            return (
                                <div key={key} style={{ marginBottom: 14 }}>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>{doc.tipo}</label>
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="form-control" style={{ borderRadius: 8, fontSize: 13 }}
                                        onChange={e => setFiles(f => ({ ...f, [key]: e.target.files[0] }))} required />
                                </div>
                            );
                        })}
                        {msg && <div style={{ background: msg.ok ? '#d1fae5' : '#fee2e2', color: msg.ok ? '#065f46' : '#991b1b', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 13 }}>{msg.texto}</div>}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="submit" disabled={subiendo} style={{ background: '#f59e0b', border: 'none', borderRadius: 8, padding: '9px 22px', fontWeight: 700, color: '#1a3a6b', cursor: 'pointer', fontSize: 14 }}>
                                {subiendo ? 'Subiendo...' : 'Confirmar subida'}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} style={{ border: '1.5px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', color: '#64748b', fontSize: 13 }}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function SeccionPago({ userId, onVolver }) {
    const [pago, setPago] = useState(undefined);

    useEffect(() => {
        fetch('/api/postulante/mi-pago', { headers: { 'Accept': 'application/json', 'X-User-Id': userId } })
            .then(r => r.json()).then(setPago).catch(() => setPago(null));
    }, []);

    const exportarPagoCSV = () => {
        if (!pago) return;
        try {
            const headers = ['Concepto', 'Monto', 'Fecha', 'Referencia', 'Estado'];
            const fila = [
                pago.concepto || 'Inscripción CUP 2026',
                'Bs. ' + (pago.monto || '700.00'),
                pago.fecha ? new Date(pago.fecha).toLocaleDateString('es-BO') : '',
                pago.pasarela_referencia || '',
                pago.estado || '',
            ];
            const csv = '﻿' + headers.join(',') + '\n' +
                fila.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = 'mi_comprobante_pago.csv'; link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generando CSV:', error);
            alert('Error al generar el CSV. Intenta de nuevo.');
        }
    };

    const exportarPagoPDF = () => {
        if (!pago) return;
        try {
            const doc = new jsPDF();
            doc.setFontSize(16); doc.setTextColor(26, 58, 107);
            doc.text('CUP-FICCT - Comprobante de Pago', 14, 15);
            doc.setFontSize(10); doc.setTextColor(100, 116, 139);
            doc.text('Generado: ' + new Date().toLocaleDateString('es-BO'), 14, 22);
            autoTable(doc, {
                startY: 30,
                head: [['Campo', 'Detalle']],
                body: [
                    ['Concepto', pago.concepto || 'Inscripción CUP 2026'],
                    ['Monto', 'Bs. ' + parseFloat(pago.monto ?? 0).toFixed(2)],
                    ['Fecha', pago.fecha ? new Date(pago.fecha).toLocaleDateString('es-BO') : ''],
                    ['Referencia', pago.pasarela_referencia || ''],
                    ['Estado', pago.estado || 'COMPLETADO'],
                ],
                headStyles: { fillColor: [26, 58, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 9 },
            });
            doc.save('mi_comprobante_pago.pdf');
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el PDF. Intenta de nuevo.');
        }
    };

    if (pago === undefined) return <Spinner />;

    const Fila = ({ label, valor }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{valor ?? '—'}</span>
        </div>
    );

    return (
        <div>
            <Volver onVolver={onVolver} titulo="Mi Pago" />
            {!pago ? (
                <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
                    No hay registro de pago aún. Completa el proceso de inscripción.
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '24px 28px', maxWidth: 560 }}>
                    <BotonesExportar onCSV={exportarPagoCSV} onPDF={exportarPagoPDF} />
                    <div style={{ background: 'linear-gradient(135deg, #1a3a6b, #2563eb)', borderRadius: 10, padding: '20px 24px', color: '#fff', marginBottom: 20 }}>
                        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Monto pagado</div>
                        <div style={{ fontSize: 36, fontWeight: 800 }}>Bs. {parseFloat(pago.monto ?? 0).toFixed(2)}</div>
                    </div>
                    <Fila label="Concepto" valor={pago.concepto} />
                    <Fila label="Referencia" valor={pago.pasarela_referencia} />
                    <Fila label="Fecha" valor={pago.fecha ? new Date(pago.fecha).toLocaleDateString('es-BO') : null} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#64748b' }}>Estado</span>
                        {pago.estado === 'COMPLETADO'
                            ? <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 6, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>✓ COMPLETADO</span>
                            : <span style={{ background: '#fef9c3', color: '#b45309', borderRadius: 6, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>PENDIENTE</span>
                        }
                    </div>
                </div>
            )}
        </div>
    );
}

function SeccionNotas({ userId, onVolver }) {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch('/api/postulante/mis-notas', { headers: { 'Accept': 'application/json', 'X-User-Id': userId } })
            .then(r => r.json()).then(setData).catch(() => {});
    }, []);

    const exportarNotasCSV = () => {
        const notas = data?.notas ?? [];
        if (notas.length === 0) return;
        try {
            const headers = ['Materia', 'Nota 1', 'Nota 2', 'Nota 3', 'Promedio', 'Estado'];
            const filas = notas.map(n => [
                n.materia || '',
                n.nota1 ?? 'Pendiente',
                n.nota2 ?? 'Pendiente',
                n.nota3 ?? 'Pendiente',
                n.nota_final ?? 'Pendiente',
                n.estado_materia || 'Pendiente',
            ]);
            filas.push(['PROMEDIO GLOBAL', '', '', '', data.promedio_global ?? 'Pendiente', data.estado_admision || 'Pendiente']);
            const csv = '﻿' + headers.join(',') + '\n' +
                filas.map(f => f.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = 'mis_notas_cup.csv'; link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generando CSV:', error);
            alert('Error al generar el CSV. Intenta de nuevo.');
        }
    };

    const exportarNotasPDF = () => {
        const notas = data?.notas ?? [];
        if (notas.length === 0) return;
        try {
            const doc = new jsPDF();
            doc.setFontSize(16); doc.setTextColor(26, 58, 107);
            doc.text('CUP-FICCT - Mis Calificaciones', 14, 15);
            doc.setFontSize(10); doc.setTextColor(100, 116, 139);
            doc.text('Generado: ' + new Date().toLocaleDateString('es-BO'), 14, 22);
            autoTable(doc, {
                startY: 30,
                head: [['Materia', 'Nota 1', 'Nota 2', 'Nota 3', 'Promedio', 'Estado']],
                body: [
                    ...notas.map(n => [
                        n.materia || '',
                        n.nota1 ?? 'Pendiente',
                        n.nota2 ?? 'Pendiente',
                        n.nota3 ?? 'Pendiente',
                        n.nota_final ?? 'Pendiente',
                        n.estado_materia || 'Pendiente',
                    ]),
                    ['PROMEDIO GLOBAL', '', '', '', data.promedio_global ?? 'Pendiente', data.estado_admision || 'Pendiente'],
                ],
                headStyles: { fillColor: [26, 58, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 9 },
                didParseCell: function(cellData) {
                    if (cellData.column.index === 5) {
                        if (cellData.cell.raw === 'APROBADO') {
                            cellData.cell.styles.textColor = [22, 163, 74];
                            cellData.cell.styles.fontStyle = 'bold';
                        } else if (cellData.cell.raw === 'REPROBADO') {
                            cellData.cell.styles.textColor = [220, 38, 38];
                            cellData.cell.styles.fontStyle = 'bold';
                        }
                    }
                },
            });
            doc.save('mis_calificaciones_cup.pdf');
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el PDF. Intenta de nuevo.');
        }
    };

    if (!data) return <Spinner />;

    const mapEstado = (e) => {
        if (!e) return <span style={{ background: '#f1f5f9', color: '#94a3b8', borderRadius: 6, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>Pendiente</span>;
        const cfg = { APROBADO: ['#dcfce7','#15803d'], REPROBADO: ['#fee2e2','#dc2626'] };
        const [bg, cl] = cfg[e] || ['#dbeafe','#1d4ed8'];
        return <span style={{ background: bg, color: cl, borderRadius: 6, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{e}</span>;
    };

    return (
        <div>
            <Volver onVolver={onVolver} titulo="Mis Notas" />
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '16px 20px 0' }}>
                    <BotonesExportar onCSV={exportarNotasCSV} onPDF={exportarNotasPDF} />
                </div>
                <div className="table-responsive">
                    <table className="table mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr>{['Materia','Nota 1','Nota 2','Nota 3','Promedio','Estado'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {(data.notas ?? []).map((n, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{n.materia}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', color: n.nota1 !== null ? '#374151' : '#cbd5e1' }}>{n.nota1 ?? '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', color: n.nota2 !== null ? '#374151' : '#cbd5e1' }}>{n.nota2 ?? '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', color: n.nota3 !== null ? '#374151' : '#cbd5e1' }}>{n.nota3 ?? '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: n.nota_final !== null ? (parseFloat(n.nota_final) >= 60 ? '#059669' : '#dc2626') : '#cbd5e1' }}>
                                        {n.nota_final !== null ? parseFloat(n.nota_final).toFixed(1) : '—'}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{mapEstado(n.estado_materia)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', minWidth: 160, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Promedio Global</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: data.promedio_global !== null ? (data.promedio_global >= 60 ? '#059669' : '#dc2626') : '#94a3b8' }}>
                        {data.promedio_global !== null ? data.promedio_global : '—'}
                    </div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Estado Final de Admisión</div>
                    {estadoBadge(data.estado_admision, true)}
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center', minWidth: 130 }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Materias con notas</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b' }}>{data.total_notas} <span style={{ fontSize: 16, color: '#94a3b8' }}>/ 4</span></div>
                </div>
            </div>
        </div>
    );
}

function SeccionGrupo({ userId, onVolver }) {
    const [data, setData] = useState(undefined);

    useEffect(() => {
        fetch('/api/postulante/mi-grupo', { headers: { 'Accept': 'application/json', 'X-User-Id': userId } })
            .then(r => r.json()).then(setData).catch(() => setData(null));
    }, []);

    const exportarGrupoCSV = () => {
        if (!data?.grupo) return;
        try {
            const grupo = data.grupo;
            const headers = ['Grupo', 'Aula', 'Horario', 'Dias', 'Total Companeros'];
            const fila = [
                grupo.nombre || '',
                grupo.aula_nombre || '',
                (grupo.horario_ini || '') + ' - ' + (grupo.horario_fin || ''),
                grupo.dias || '',
                String(data.total_companeros || ''),
            ];
            const csv = '﻿' + headers.join(',') + '\n' +
                fila.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = 'mi_grupo_cup.csv'; link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generando CSV:', error);
            alert('Error al generar el CSV. Intenta de nuevo.');
        }
    };

    const exportarGrupoPDF = () => {
        if (!data?.grupo) return;
        try {
            const grupo = data.grupo;
            const doc = new jsPDF();
            doc.setFontSize(16); doc.setTextColor(26, 58, 107);
            doc.text('CUP-FICCT - Mi Grupo', 14, 15);
            doc.setFontSize(10); doc.setTextColor(100, 116, 139);
            doc.text('Generado: ' + new Date().toLocaleDateString('es-BO'), 14, 22);
            autoTable(doc, {
                startY: 30,
                head: [['Campo', 'Detalle']],
                body: [
                    ['Grupo', grupo.nombre || ''],
                    ['Aula', grupo.aula_nombre || ''],
                    ['Horario', (grupo.horario_ini || '') + ' - ' + (grupo.horario_fin || '')],
                    ['Dias de clase', grupo.dias || ''],
                    ['Total companeros', String(data.total_companeros || '')],
                    ['Carrera Asignada', data.carrera_asignada || 'En proceso'],
                    ['Gestión', String(data.gestion || '')],
                ],
                headStyles: { fillColor: [26, 58, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 9 },
            });
            const docentes = data.docentes_materias ?? [];
            if (docentes.length > 0) {
                autoTable(doc, {
                    startY: doc.previousAutoTable.finalY + 10,
                    head: [['Materia', 'Docente', 'Aula']],
                    body: docentes.map(d => [
                        d.materia || '',
                        (d.docente_nombres || '') + ' ' + (d.docente_apellidos || ''),
                        d.aula_materia || '',
                    ]),
                    headStyles: { fillColor: [26, 58, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    styles: { fontSize: 9 },
                });
            }
            doc.save('mi_grupo_cup.pdf');
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el PDF. Intenta de nuevo.');
        }
    };

    if (data === undefined) return <Spinner />;

    const grupo = data?.grupo;

    if (!grupo) {
        return (
            <div>
                <Volver onVolver={onVolver} titulo="Mi Grupo" />
                <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', color: '#94a3b8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
                    Aún no tienes grupo asignado. Los grupos se asignan luego de completar el proceso de inscripción.
                </div>
            </div>
        );
    }

    const diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
    const diasLabel  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    const tieneClase = (dia) => {
        if (!grupo.dias) return false;
        const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        return norm(grupo.dias).includes(norm(dia));
    };

    const getTurno = () => {
        if (!grupo.horario_ini) return 'manana';
        const h = parseInt(grupo.horario_ini.split(':')[0]);
        if (h < 13) return 'manana';
        if (h < 18) return 'tarde';
        return 'noche';
    };

    const turnoInfo = {
        manana: { icono: '🌅', label: 'Mañana', bgColor: '#FFF9C4', textColor: '#F57F17', badgeColor: '#f59e0b', badgeText: '#1a3a6b' },
        tarde:  { icono: '🌇', label: 'Tarde',  bgColor: '#FFE0B2', textColor: '#E65100', badgeColor: '#f97316', badgeText: '#fff' },
        noche:  { icono: '🌙', label: 'Noche',  bgColor: '#E8EAF6', textColor: '#1a3a6b', badgeColor: '#3949ab', badgeText: '#fff' },
    }[getTurno()];

    const getMateriaIcono = (materia) => {
        const m = (materia || '').toLowerCase();
        if (m.includes('comput') || m.includes('inform')) return '🖥️';
        if (m.includes('matem') || m.includes('calculo') || m.includes('cálculo')) return '📐';
        if (m.includes('fisic') || m.includes('física')) return '🔬';
        if (m.includes('ingles') || m.includes('inglés') || m.includes('idioma')) return '🌍';
        return '📚';
    };

    return (
        <div>
            <Volver onVolver={onVolver} titulo="Mi Grupo" />
            <BotonesExportar onCSV={exportarGrupoCSV} onPDF={exportarGrupoPDF} />

            {/* 1. Card información del grupo */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', padding: '24px 28px', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                    <span style={{ fontWeight: 800, color: '#1a3a6b', fontSize: 22 }}>{grupo.nombre}</span>
                    <span style={{ background: turnoInfo.badgeColor, color: turnoInfo.badgeText, borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>
                        {turnoInfo.icono} {turnoInfo.label}
                    </span>
                </div>
                <div className="row g-3">
                    <div className="col-md-4 col-6">
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Horario</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{turnoInfo.icono} {grupo.horario_ini} - {grupo.horario_fin}</div>
                    </div>
                    <div className="col-md-4 col-6">
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Aula</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>🏫 {grupo.aula_nombre || '—'}</div>
                    </div>
                    <div className="col-md-4 col-6">
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Compañeros</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>👥 {data.total_companeros} estudiantes</div>
                    </div>
                </div>
            </div>

            {/* 2. Calendario semanal visual */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', padding: '20px 24px', marginBottom: 24 }}>
                <h6 style={{ color: '#1a3a6b', fontWeight: 700, marginBottom: 16, fontSize: 15 }}>📅 Horario Semanal</h6>
                <div style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', gap: 8, minWidth: 770 }}>
                        {diasSemana.map((dia, i) => {
                            const activo = tieneClase(dia);
                            const cellBg    = activo ? turnoInfo.bgColor  : '#F5F5F5';
                            const cellColor = activo ? turnoInfo.textColor : '#9E9E9E';
                            return (
                                <div key={dia} style={{ background: cellBg, borderRadius: 8, padding: '12px 6px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: cellColor, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{diasLabel[i]}</div>
                                    <div style={{ fontSize: 26 }}>{activo ? turnoInfo.icono : '😴'}</div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: cellColor, lineHeight: 1.4 }}>
                                        {activo ? <span>{grupo.horario_ini}<br />{grupo.horario_fin}</span> : <span>Libre</span>}
                                    </div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: cellColor, background: activo ? 'rgba(0,0,0,0.07)' : 'transparent', borderRadius: 4, padding: '1px 6px', minHeight: 16 }}>
                                        {activo ? 'Clases' : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 3. Tarjetas de materias y docentes */}
            <h6 style={{ color: '#1a3a6b', fontWeight: 700, marginBottom: 12, fontSize: 15 }}>📚 Materias y Docentes</h6>
            <div className="row g-3 mb-4">
                {(data.docentes_materias ?? []).length === 0 ? (
                    <div className="col-12">
                        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                            Sin docentes asignados aún.
                        </div>
                    </div>
                ) : (data.docentes_materias ?? []).map((dm, i) => (
                    <div className="col-md-6 col-12" key={i}>
                        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `3px solid ${turnoInfo.badgeColor}`, height: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <span style={{ fontSize: 28 }}>{getMateriaIcono(dm.materia)}</span>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 14 }}>{dm.materia}</div>
                                    <span style={{ background: turnoInfo.bgColor, color: turnoInfo.textColor, borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                                        {turnoInfo.icono} {turnoInfo.label}
                                    </span>
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Docente</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>👨‍🏫 {dm.docente_nombres} {dm.docente_apellidos}</div>
                                {dm.aula_materia && (
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>🏫 Aula: {dm.aula_materia}</div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Turno preferido vs asignado */}
            {data.turno_preferido && (
                <div style={{ marginBottom: 24 }}>
                    {(() => {
                        const turnoAsignado = getTurno();
                        const coincide = turnoAsignado === data.turno_preferido;
                        const labelTurno = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
                        const iconTurno  = { manana: '🌅', tarde: '🌇', noche: '🌙' };
                        const bgPref = { manana: '#FFF9C4', tarde: '#FFE0B2', noche: '#E8EAF6' };
                        const clPref = { manana: '#92400e', tarde: '#7c2d12', noche: '#1a3a6b' };
                        return (
                            <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                <div className="row g-3 align-items-center">
                                    <div className="col-md-5">
                                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Tu turno preferido</div>
                                        <span style={{ background: bgPref[data.turno_preferido] || '#f1f5f9', color: clPref[data.turno_preferido] || '#374151', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700, display: 'inline-block' }}>
                                            {iconTurno[data.turno_preferido]} {labelTurno[data.turno_preferido] || data.turno_preferido}
                                        </span>
                                    </div>
                                    <div className="col-md-5">
                                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Turno asignado</div>
                                        <span style={{ background: bgPref[turnoAsignado] || '#f1f5f9', color: clPref[turnoAsignado] || '#374151', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700, display: 'inline-block' }}>
                                            {iconTurno[turnoAsignado]} {labelTurno[turnoAsignado] || turnoAsignado}
                                        </span>
                                    </div>
                                    <div className="col-md-2">
                                        {coincide ? (
                                            <div style={{ background: '#dcfce7', color: '#15803d', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                                                ✓ Tu turno preferido
                                            </div>
                                        ) : (
                                            <div style={{ background: '#fef9c3', color: '#92400e', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                                                ⚠ Sin cupo en tu turno preferido
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* 4. Card resumen personal */}
            <div style={{ background: 'linear-gradient(135deg, #1a3a6b, #2563eb)', borderRadius: 14, padding: '24px 28px', color: '#fff' }}>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Tu Resumen en el Grupo</div>
                <div className="row g-3">
                    <div className="col-md-6">
                        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 18px' }}>
                            <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4 }}>Número en el grupo</div>
                            <div style={{ fontSize: 20, fontWeight: 800 }}>
                                #{data.numero_en_grupo} <span style={{ fontSize: 13, opacity: 0.7 }}>de {data.total_companeros} estudiantes</span>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 18px' }}>
                            <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4 }}>Estado de Admisión</div>
                            {estadoBadge(data.estado_admision, true)}
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 18px' }}>
                            <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4 }}>Carrera Asignada</div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>🎓 {data.carrera_asignada || 'En proceso'}</div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 18px' }}>
                            <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4 }}>Gestión</div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>📅 {data.gestion || new Date().getFullYear()}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Panel Principal ──────────────────────────────────────────────────────────

/**
 * CU3: misDatos() → GET /api/postulante/mis-datos
 * CU4: miPostulacion() → GET /api/postulante/mi-postulacion
 * CU5: misDocumentos() → GET /api/postulante/mis-documentos
 * CU6: miPago() → GET /api/postulante/mi-pago
 * CU12 FLUJO 2: misNotas() → GET /api/postulante/mis-notas
 *   Mensaje 2.4: mostrarCalificaciones(materia, nota1, nota2,
 *   nota3, promedio, estado_materia, promedio_global, estado_admision)
 */
export default function PanelPostulante({ user, onLogout }) {
    const [seccion, setSeccion]     = useState(null);
    const [resumen, setResumen]     = useState(null);
    const [hoverLogout, setHoverLogout] = useState(false);

    useEffect(() => {
        fetch('/api/postulante/mi-resumen', { headers: { 'Accept': 'application/json', 'X-User-Id': user.id } })
            .then(r => r.json()).then(setResumen).catch(() => {});
    }, []);

    const nombre = resumen ? `${resumen.nombres} ${resumen.apellidos}` : user.username;

    const modulos = [
        { id: 'datos',       icono: '👤', titulo: 'Mis Datos Personales',   desc: 'Ver y editar tu información personal',       btn: 'Ver mis datos' },
        { id: 'postulacion', icono: '📋', titulo: 'Mi Postulación',          desc: 'Consulta el estado de tu admisión',           btn: 'Ver postulación' },
        { id: 'documentos',  icono: '📄', titulo: 'Mis Documentos',          desc: 'Gestiona tus documentos requeridos',          btn: 'Ver documentos' },
        { id: 'pago',        icono: '💳', titulo: 'Mi Pago',                 desc: 'Verifica tu comprobante de pago',             btn: 'Ver pago' },
        { id: 'notas',       icono: '📊', titulo: 'Mis Notas',               desc: 'Consulta tus calificaciones por materia',     btn: 'Ver notas' },
        { id: 'grupo',       icono: '🏫', titulo: 'Mi Grupo',                desc: 'Información de tu grupo asignado',            btn: 'Ver grupo' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

            {/* Navbar */}
            <nav style={{ background: 'linear-gradient(135deg,#1a3a6b 0%,#2563eb 100%)', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(26,58,107,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.3rem' }}>🎓</span>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                        CUP - FICCT
                        <span className="d-none d-sm-inline" style={{ opacity: 0.6, fontWeight: 400 }}> | Portal Postulante</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="d-none d-sm-block" style={{ textAlign: 'right' }}>
                        <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{nombre}</div>
                        <span style={{ background: '#f59e0b', color: '#1a3a6b', borderRadius: 10, padding: '1px 10px', fontSize: 11, fontWeight: 700 }}>Postulante</span>
                    </div>
                    <button onClick={onLogout} onMouseEnter={() => setHoverLogout(true)} onMouseLeave={() => setHoverLogout(false)}
                        style={{ background: hoverLogout ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 8, color: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
                        <span className="d-none d-sm-inline">Cerrar Sesión</span>
                        <span className="d-sm-none">🚪</span>
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <div style={{ background: '#1a3a6b', padding: '24px 16px 28px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    {seccion === null ? (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 24, margin: 0 }}>Bienvenido, {nombre} 👋</h2>
                            </div>
                            <p style={{ color: '#93c5fd', fontSize: 14, margin: '0 0 20px' }}>Portal de Admisión CUP 2026</p>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: '#bfdbfe', fontSize: 13 }}>Estado de admisión:</span>
                                {resumen ? estadoBadge(resumen.estado_admision, true) : <span style={{ color: '#64748b' }}>—</span>}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div style={{ color: '#93c5fd', fontSize: 13, marginBottom: 4 }}>Portal de Admisión CUP 2026</div>
                            <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{nombre}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats (solo en panel principal) */}
            {seccion === null && resumen && (
                <div style={{ maxWidth: 1100, margin: '-1px auto 0', padding: '0 24px' }}>
                    <div className="row g-3 mb-4" style={{ marginTop: 0, paddingTop: 24 }}>
                        {[
                            { label: 'Estado Admisión',   val: resumen.estado_admision,   grad: 'linear-gradient(135deg,#1a3a6b,#2563eb)' },
                            { label: 'Carrera Asignada',  val: resumen.carrera_asignada,  grad: 'linear-gradient(135deg,#0369a1,#0284c7)' },
                            { label: 'Grupo Asignado',    val: resumen.grupo_nombre,      grad: 'linear-gradient(135deg,#15803d,#16a34a)' },
                            { label: 'Notas Registradas', val: `${resumen.notas_registradas} de 4`, grad: 'linear-gradient(135deg,#d97706,#f59e0b)' },
                        ].map(({ label, val, grad }) => (
                            <div className="col-md-3 col-6" key={label}>
                                <div style={{ background: grad, borderRadius: 12, padding: '16px 18px', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                                    <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{val || '—'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Contenido */}
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: seccion === null ? '0 24px 32px' : '28px 24px 32px' }}>

                {/* Módulos del panel principal */}
                {seccion === null && (
                    <div>
                        <h5 style={{ color: '#1a3a6b', fontWeight: 700, marginBottom: 16, fontSize: 17 }}>Mi Portal</h5>
                        <div className="row g-3">
                            {modulos.map(mod => (
                                <div className="col-12 col-md-4" key={mod.id}>
                                    <ModuloCard mod={mod} onClick={() => setSeccion(mod.id)} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Secciones */}
                {seccion === 'datos'       && <SeccionDatos       userId={user.id} onVolver={() => setSeccion(null)} />}
                {seccion === 'postulacion' && <SeccionPostulacion userId={user.id} onVolver={() => setSeccion(null)} />}
                {seccion === 'documentos'  && <SeccionDocumentos  userId={user.id} onVolver={() => setSeccion(null)} />}
                {seccion === 'pago'        && <SeccionPago        userId={user.id} onVolver={() => setSeccion(null)} />}
                {seccion === 'notas'       && <SeccionNotas       userId={user.id} onVolver={() => setSeccion(null)} />}
                {seccion === 'grupo'       && <SeccionGrupo       userId={user.id} onVolver={() => setSeccion(null)} />}
            </div>

        </div>
    );
}

function ModuloCard({ mod, onClick }) {
    const [hover, setHover] = useState(false);
    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{ background: '#fff', borderRadius: 14, padding: '20px 18px', boxShadow: hover ? '0 8px 24px rgba(26,58,107,0.15)' : '0 2px 8px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s', border: '1px solid #e8edf5', height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{mod.icono}</div>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, marginBottom: 6 }}>{mod.titulo}</div>
            <div style={{ color: '#64748b', fontSize: 12, flexGrow: 1, marginBottom: 14 }}>{mod.desc}</div>
            <button onClick={onClick} style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>
                {mod.btn}
            </button>
        </div>
    );
}
