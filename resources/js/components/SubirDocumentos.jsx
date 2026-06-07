import React, { useState, useRef } from 'react';

const DOCS = [
    { key: 'documento_0', tipo: 'Certificado de Nacimiento', icono: '📄' },
    { key: 'documento_1', tipo: 'CI Anverso/Reverso',        icono: '🪪' },
    { key: 'documento_2', tipo: 'Fotografía Fondo Rojo',     icono: '📷' },
    { key: 'documento_3', tipo: 'Título de Bachiller',       icono: '🎓' },
];

const MAX_SIZE  = 5 * 1024 * 1024;
const ACCEPT    = '.pdf,.jpg,.jpeg,.png';
const VALID_EXT = /\.(pdf|jpg|jpeg|png)$/i;

function formatSize(bytes) {
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * CU5 - GESTIONAR DOCUMENTOS DE POSTULANTES
 * Mensaje 1: adjuntarDocumento(tipo, archivo) → handleSeleccionarArchivo()
 * ALT [archivo válido]:
 *   Mensaje 1.2: almacenarArchivo() → POST /api/registro/paso1b
 *   Mensaje 1.8: mostrarConfirmacion() → badge verde Listo
 * ALT [formato inválido]:
 *   Mensaje 1.6: retornarError(formato no permitido)
 * ALT [tamaño excedido]:
 *   Mensaje 1.7: retornarError(archivo demasiado grande)
 */
function SubirDocumentos({ datos, onPagar, onVolver }) {
    const [archivos, setArchivos]         = useState({ documento_0: null, documento_1: null, documento_2: null, documento_3: null });
    const [errores, setErrores]           = useState({});
    const [enviando, setEnviando]         = useState(false);
    const [errorGeneral, setErrorGeneral] = useState('');

    const refs = {
        documento_0: useRef(), documento_1: useRef(),
        documento_2: useRef(), documento_3: useRef(),
    };

    const seleccionados   = Object.values(archivos).filter(Boolean).length;
    const progreso        = Math.round((seleccionados / DOCS.length) * 100);
    const listoParaEnviar = seleccionados === DOCS.length && !enviando;

    const handleFile = (key, file) => {
        if (!file) return;
        if (!VALID_EXT.test(file.name)) {
            setErrores(e => ({ ...e, [key]: 'Formato no válido. Use PDF, JPG o PNG.' }));
            return;
        }
        if (file.size > MAX_SIZE) {
            setErrores(e => ({ ...e, [key]: `El archivo excede 5 MB (${formatSize(file.size)}).` }));
            return;
        }
        setArchivos(a => ({ ...a, [key]: file }));
        setErrores(e => ({ ...e, [key]: '' }));
    };

    const handleSubmit = async () => {
        setEnviando(true);
        setErrorGeneral('');

        const fd = new FormData();
        fd.append('postulacion_id', datos.postulacion_id);
        DOCS.forEach(({ key }) => fd.append(key, archivos[key]));

        try {
            const res  = await fetch('/api/registro/paso1b', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: fd,
            });
            const data = await res.json();
            if (res.ok) {
                onPagar(datos);
            } else {
                if (data.errors) {
                    const mapped = {};
                    Object.entries(data.errors).forEach(([k, v]) => { mapped[k] = v[0]; });
                    setErrores(mapped);
                } else {
                    setErrorGeneral(data.message || 'Error al subir documentos.');
                }
            }
        } catch {
            setErrorGeneral('Error de conexión con el servidor.');
        } finally {
            setEnviando(false);
        }
    };

    const pasos = ['Datos', 'Documentos', 'Pago', 'Credenciales'];
    const pasosProceso = ['Datos personales', 'Documentos', 'Pago Bs. 700', 'Credenciales'];

    return (
        <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

            {/* LEFT PANEL */}
            <div className="d-none d-md-flex" style={{
                flex: '0 0 35%', background: '#1a3a6b',
                flexDirection: 'column', justifyContent: 'center',
                padding: '3rem 2.5rem', position: 'sticky', top: 0, height: '100vh',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1.5px, transparent 1.5px)',
                    backgroundSize: '28px 28px',
                }} />
                <div style={{ position: 'absolute', top: -70, right: -70, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', bottom: -50, left: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(245,158,11,0.06)' }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1.1rem', fontSize: '2.2rem', lineHeight: 1,
                    }}>🎓</div>

                    <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.6rem', marginBottom: '0.3rem' }}>
                        CUP - FICCT
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.84rem', marginBottom: '1.5rem' }}>
                        Facultad de Ingeniería — UAGRM
                    </p>

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', marginBottom: '1.5rem' }} />

                    <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.72rem', marginBottom: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Proceso de Inscripción
                    </p>
                    {pasosProceso.map((paso, i) => (
                        <div key={paso} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.7rem' }}>
                            <div style={{
                                background: i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                                color: i < 2 ? (i === 0 ? '#fff' : '#1a3a6b') : 'rgba(255,255,255,0.8)',
                                borderRadius: '50%', width: 26, height: 26,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
                            }}>{i === 0 ? '✓' : i + 1}</div>
                            <span style={{
                                color: i === 1 ? '#f59e0b' : i === 0 ? '#10b981' : 'rgba(255,255,255,0.65)',
                                fontSize: '0.84rem', fontWeight: i === 1 ? 700 : 400,
                            }}>{paso}</span>
                        </div>
                    ))}

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '1.5rem 0' }} />

                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '1rem' }}>
                        <p style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.8rem', margin: '0 0 0.4rem' }}>
                            📋 Documentos requeridos
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', margin: 0, lineHeight: 1.5 }}>
                            Formatos: PDF, JPG, PNG<br />
                            Tamaño máximo: 5 MB por archivo
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{
                flexGrow: 1, background: '#fff',
                overflowY: 'auto', padding: '2.5rem 2.5rem 3rem',
            }}>
                <div style={{ maxWidth: 640, margin: '0 auto' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '0.25rem', fontSize: '1.4rem' }}>
                            📄 Documentos Requeridos
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 0.75rem' }}>
                            Documentos de {datos?.nombres} {datos?.apellidos}
                        </p>
                        <div style={{ height: 3, width: 48, background: '#f59e0b', borderRadius: 2 }} />
                    </div>

                    {/* Step progress bar */}
                    <div style={{ display: 'flex', marginBottom: '2rem', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        {pasos.map((s, i) => (
                            <div key={s} style={{
                                flex: 1, padding: '0.65rem 0.5rem', textAlign: 'center',
                                fontSize: '0.78rem', fontWeight: 600,
                                borderTop: `3px solid ${i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : '#e2e8f0'}`,
                                color: i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : '#94a3b8',
                                background: i === 1 ? '#fffbeb' : '#fff',
                                borderRight: i < pasos.length - 1 ? '1px solid #e2e8f0' : 'none',
                            }}>
                                {i === 0 ? '✓' : i === 1 ? '◉' : `${i + 1}`} {s}
                            </div>
                        ))}
                    </div>

                    {/* Progress bar */}
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Progreso de carga</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: seleccionados === DOCS.length ? '#059669' : '#f59e0b' }}>
                                {seleccionados} / {DOCS.length} documentos
                            </span>
                        </div>
                        <div style={{ background: '#e2e8f0', borderRadius: 99, height: 10, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${progreso}%`,
                                background: seleccionados === DOCS.length
                                    ? 'linear-gradient(90deg,#059669,#10b981)'
                                    : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                                borderRadius: 99, transition: 'width 0.3s ease',
                            }} />
                        </div>
                    </div>

                    {errorGeneral && (
                        <div className="alert alert-danger py-2 small mb-3" style={{ borderRadius: 8 }}>
                            {errorGeneral}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
                        {DOCS.map(({ key, tipo, icono }) => {
                            const archivo = archivos[key];
                            const error   = errores[key];
                            const listo   = !!archivo && !error;

                            return (
                                <div key={key} style={{
                                    borderRadius: 12,
                                    padding: '1rem 1.2rem',
                                    border: `1.5px solid ${listo ? '#10b981' : error ? '#ef4444' : '#e2e8f0'}`,
                                    background: listo ? '#f0fdf4' : error ? '#fef2f2' : '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                                        <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{icono}</span>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{tipo}</div>
                                            {listo ? (
                                                <div style={{ color: '#059669', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                                                    ✓ {archivo.name} · {formatSize(archivo.size)}
                                                </div>
                                            ) : error ? (
                                                <div style={{ color: '#ef4444', fontSize: '0.78rem' }}>{error}</div>
                                            ) : (
                                                <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>PDF, JPG, PNG · máx. 5 MB</div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <span style={{
                                            fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.6rem',
                                            borderRadius: 20,
                                            background: listo ? '#dcfce7' : '#fef9c3',
                                            color: listo ? '#059669' : '#92400e',
                                        }}>
                                            {listo ? '✓ Listo' : 'Pendiente'}
                                        </span>
                                        <input
                                            ref={refs[key]}
                                            type="file"
                                            accept={ACCEPT}
                                            className="d-none"
                                            onChange={e => handleFile(key, e.target.files[0])}
                                        />
                                        <button
                                            type="button"
                                            style={{
                                                border: `1.5px solid ${listo ? '#059669' : '#2563eb'}`,
                                                background: 'transparent',
                                                color: listo ? '#059669' : '#2563eb',
                                                borderRadius: 7, padding: '0.4rem 0.9rem',
                                                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                                            }}
                                            onClick={() => refs[key].current.click()}
                                        >
                                            {listo ? '↺ Cambiar' : '+ Seleccionar'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="d-flex flex-column flex-sm-row gap-3 justify-content-between">
                        <button
                            type="button"
                            style={{ background: 'transparent', border: '1.5px solid #cbd5e1', color: '#64748b', borderRadius: 8, padding: '0.6rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}
                            onClick={onVolver}
                            disabled={enviando}
                        >
                            ← Volver
                        </button>
                        <button
                            type="button"
                            style={{
                                background: !listoParaEnviar ? '#94a3b8' : '#f59e0b',
                                color: !listoParaEnviar ? '#fff' : '#1a3a6b',
                                border: 'none', borderRadius: 8,
                                padding: '0.6rem 1.5rem', fontWeight: 700,
                                cursor: listoParaEnviar ? 'pointer' : 'not-allowed',
                                boxShadow: listoParaEnviar ? '0 4px 14px rgba(245,158,11,0.4)' : 'none',
                                fontSize: '0.95rem', flexGrow: 1,
                            }}
                            onClick={handleSubmit}
                            disabled={!listoParaEnviar}
                            title={seleccionados < DOCS.length ? `Faltan ${DOCS.length - seleccionados} documento(s)` : ''}
                        >
                            {enviando
                                ? <><span className="spinner-border spinner-border-sm me-2" />Subiendo...</>
                                : `Continuar al Pago → (${seleccionados}/${DOCS.length})`
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SubirDocumentos;
