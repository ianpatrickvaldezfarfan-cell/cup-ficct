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

    return (
        <div className="min-vh-100 bg-light py-4">
            <div className="container" style={{ maxWidth: 680 }}>

                {/* Header con pasos */}
                <div className="text-center mb-4">
                    <h2 className="fw-bold text-primary mb-1">CUP - FICCT</h2>
                    <p className="text-muted mb-0">Documentos Requeridos</p>
                    <div className="d-flex justify-content-center gap-2 mt-3">
                        {['Datos', 'Documentos', 'Pago', 'Credenciales'].map((s, i) => (
                            <span key={i} className={`badge rounded-pill px-3 py-2 ${i === 1 ? 'bg-primary' : 'bg-secondary bg-opacity-25 text-secondary'}`}>
                                {i + 1}. {s}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-primary text-white py-2">
                        <h6 className="mb-0 fw-bold">
                            Documentos de {datos?.nombres} {datos?.apellidos}
                        </h6>
                    </div>
                    <div className="card-body">
                        <p className="text-muted small mb-3">
                            Sube los documentos necesarios para completar tu inscripción.
                            Formatos aceptados: <strong>PDF, JPG, JPEG, PNG</strong>. Tamaño máximo: <strong>5 MB</strong>.
                        </p>

                        {/* Barra de progreso */}
                        <div className="mb-4">
                            <div className="d-flex justify-content-between small mb-1">
                                <span className="fw-semibold">Progreso</span>
                                <span className={seleccionados === DOCS.length ? 'text-success fw-bold' : 'text-muted'}>
                                    {seleccionados} / {DOCS.length} documentos listos
                                </span>
                            </div>
                            <div className="progress" style={{ height: 10 }}>
                                <div
                                    className={`progress-bar ${seleccionados === DOCS.length ? 'bg-success' : 'bg-primary'}`}
                                    style={{ width: `${progreso}%`, transition: 'width .3s ease' }}
                                />
                            </div>
                        </div>

                        {errorGeneral && (
                            <div className="alert alert-danger py-2 small mb-3">{errorGeneral}</div>
                        )}

                        {/* Tarjetas de documentos */}
                        <div className="d-flex flex-column gap-3">
                            {DOCS.map(({ key, tipo, icono }) => {
                                const archivo = archivos[key];
                                const error   = errores[key];
                                const listo   = !!archivo && !error;

                                return (
                                    <div
                                        key={key}
                                        className={`border rounded-3 p-3 ${
                                            listo  ? 'border-success bg-success bg-opacity-10' :
                                            error  ? 'border-danger bg-danger bg-opacity-10'   :
                                                     'border-secondary border-opacity-25'
                                        }`}
                                    >
                                        <div className="d-flex align-items-center justify-content-between gap-3">
                                            {/* Info del documento */}
                                            <div className="d-flex align-items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
                                                <span style={{ fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 }}>
                                                    {icono}
                                                </span>
                                                <div style={{ minWidth: 0 }}>
                                                    <div className="fw-semibold">{tipo}</div>
                                                    {archivo && !error ? (
                                                        <div className="text-success small text-truncate" style={{ maxWidth: 300 }}>
                                                            {archivo.name} · {formatSize(archivo.size)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-muted small">PDF, JPG, PNG · máx. 5 MB</div>
                                                    )}
                                                    {error && (
                                                        <div className="text-danger small mt-1">{error}</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Badge + botón */}
                                            <div className="d-flex align-items-center gap-2" style={{ flexShrink: 0 }}>
                                                <span className={`badge ${listo ? 'bg-success' : 'bg-danger'}`}>
                                                    {listo ? '✓ Listo' : 'Requerido'}
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
                                                    className={`btn btn-sm ${listo ? 'btn-outline-success' : 'btn-outline-primary'}`}
                                                    onClick={() => refs[key].current.click()}
                                                >
                                                    {listo ? 'Cambiar' : 'Seleccionar'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                <div className="d-flex gap-3 justify-content-between mb-5">
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={onVolver}
                        disabled={enviando}
                    >
                        ← Volver
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary px-4"
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
    );
}

export default SubirDocumentos;
