import React, { useState } from 'react';

function RegistroExito({ credenciales, onLogin }) {
    const [copiado, setCopiado] = useState('');

    const copiar = (texto, campo) => {
        navigator.clipboard.writeText(texto).then(() => {
            setCopiado(campo);
            setTimeout(() => setCopiado(''), 2000);
        });
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center py-4"
             style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)' }}>
            <div style={{ width: '100%', maxWidth: 480 }} className="px-3">

                {/* Indicador de pasos */}
                <div className="d-flex justify-content-center gap-2 mb-4">
                    {['Datos', 'Documentos', 'Pago', 'Credenciales'].map((s, i) => (
                        <span key={i} className={`badge rounded-pill px-3 py-2 ${i === 3 ? 'bg-success' : 'bg-secondary bg-opacity-25 text-secondary'}`}>
                            {i + 1}. {s}
                        </span>
                    ))}
                </div>

                <div className="card shadow-lg border-0 rounded-4 text-center">
                    <div className="card-body p-5">

                        {/* Ícono de éxito */}
                        <div className="mb-3" style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: '#e8f5e9', margin: '0 auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 0 12px #c8e6c9',
                        }}>
                            <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>✓</span>
                        </div>

                        <h3 className="fw-bold text-success mt-3 mb-1">
                            ¡Registro completado!
                        </h3>
                        <p className="text-muted mb-4">
                            Tu pago de <strong>Bs. 700.00</strong> fue procesado correctamente
                        </p>

                        {/* Tarjeta de credenciales */}
                        <div className="rounded-3 p-4 mb-4 text-start"
                             style={{ background: 'linear-gradient(135deg, #1a237e, #0d47a1)', color: 'white' }}>
                            <div className="fw-bold mb-3 text-center" style={{ fontSize: '0.8rem', letterSpacing: 2, opacity: 0.8 }}>
                                TUS CREDENCIALES DE ACCESO
                            </div>

                            <div className="mb-3">
                                <div style={{ fontSize: '0.7rem', opacity: 0.7, letterSpacing: 1 }}>USUARIO</div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="fw-bold" style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                        {credenciales?.username}
                                    </span>
                                    <button
                                        className="btn btn-sm btn-outline-light py-0 px-2"
                                        onClick={() => copiar(credenciales?.username, 'usuario')}
                                        style={{ fontSize: '0.7rem' }}
                                    >
                                        {copiado === 'usuario' ? '✓ Copiado' : 'Copiar'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.7, letterSpacing: 1 }}>CONTRASEÑA</div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="fw-bold" style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: 2 }}>
                                        {credenciales?.password}
                                    </span>
                                    <button
                                        className="btn btn-sm btn-outline-light py-0 px-2"
                                        onClick={() => copiar(credenciales?.password, 'password')}
                                        style={{ fontSize: '0.7rem' }}
                                    >
                                        {copiado === 'password' ? '✓ Copiado' : 'Copiar'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="alert alert-warning py-2 small text-start mb-4">
                            <strong>Importante:</strong> Guarda estas credenciales en un lugar seguro.
                            Las necesitarás para acceder al sistema y no podrán recuperarse.
                        </div>

                        {/* Documentos pendientes */}
                        <div className="text-start mb-4">
                            <p className="fw-semibold small mb-2 text-muted">Documentos a presentar:</p>
                            <ul className="list-unstyled small">
                                {['Certificado de Nacimiento', 'CI Anverso/Reverso',
                                  'Fotografía Fondo Rojo', 'Título de Bachiller'].map((d, i) => (
                                    <li key={i} className="d-flex align-items-center gap-2 mb-1 text-muted">
                                        <span className="text-warning">●</span> {d}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button className="btn btn-primary w-100 fw-bold py-2" onClick={onLogin}>
                            Ir al Login →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegistroExito;
