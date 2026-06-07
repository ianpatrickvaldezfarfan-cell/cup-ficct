import React, { useState, useEffect } from 'react';

function RegistroExito({ credenciales, onLogin }) {
    const [copiado, setCopiado] = useState('');
    const [countdown, setCountdown] = useState(30);
    const [confettiPieces] = useState(() =>
        Array.from({ length: 30 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 2,
            duration: 2 + Math.random() * 2,
            color: ['#f59e0b', '#2563eb', '#059669', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
            size: 6 + Math.random() * 8,
        }))
    );

    const copiar = (texto, campo) => {
        navigator.clipboard.writeText(texto).then(() => {
            setCopiado(campo);
            setTimeout(() => setCopiado(''), 2000);
        });
    };

    useEffect(() => {
        if (countdown <= 0) { onLogin(); return; }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown, onLogin]);

    const pasos = ['Datos', 'Documentos', 'Pago', 'Credenciales'];

    return (
        <div style={{ minHeight: '100vh', background: '#1a3a6b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', fontFamily: "'Segoe UI', system-ui, sans-serif", position: 'relative' }}>

            {/* Confetti */}
            <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 9999, top: 0, left: 0, width: '100%', height: 0 }}>
                {confettiPieces.map(p => (
                    <div
                        key={p.id}
                        style={{
                            position: 'absolute',
                            top: -10,
                            left: `${p.left}%`,
                            width: p.size,
                            height: p.size * 0.6,
                            background: p.color,
                            borderRadius: 2,
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                            animationName: 'confettiFall',
                            animationTimingFunction: 'linear',
                            animationFillMode: 'forwards',
                        }}
                    />
                ))}
            </div>

            <div style={{ width: '100%', maxWidth: 500, position: 'relative', zIndex: 1 }}>

                {/* Step bar */}
                <div style={{ display: 'flex', marginBottom: '1.75rem' }}>
                    {pasos.map((s, i) => (
                        <div key={s} style={{
                            flex: 1, padding: '0.55rem 0.5rem', textAlign: 'center',
                            fontSize: '0.75rem', fontWeight: 600,
                            borderTop: `3px solid #10b981`,
                            color: '#10b981',
                        }}>
                            ✓ {s}
                        </div>
                    ))}
                </div>

                {/* Main card */}
                <div style={{ background: '#fff', borderRadius: 18, padding: '2.5rem', boxShadow: '0 25px 80px rgba(0,0,0,0.4)', textAlign: 'center' }}>

                    {/* Check icon */}
                    <div style={{
                        width: 88, height: 88, borderRadius: '50%',
                        background: '#dcfce7', margin: '0 auto 0.75rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 0 14px #bbf7d0',
                    }}>
                        <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>✓</span>
                    </div>

                    <h2 style={{ fontWeight: 800, color: '#1a3a6b', marginBottom: '0.35rem' }}>
                        ¡Registro completado!
                    </h2>
                    <p style={{ color: '#64748b', marginBottom: '0.75rem', fontSize: '0.92rem' }}>
                        Tu pago de <strong style={{ color: '#059669' }}>Bs. 700.00</strong> fue procesado correctamente
                    </p>
                    <div style={{ height: 3, width: 60, background: '#f59e0b', borderRadius: 2, margin: '0 auto 1.75rem' }} />

                    {/* Credential card — gold style */}
                    <div style={{
                        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 60%, #fde68a 100%)',
                        border: '2px solid #f59e0b',
                        borderRadius: 14, padding: '1.5rem',
                        marginBottom: '1rem', position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(245,158,11,0.1)' }} />

                        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: 2, color: '#92400e', textAlign: 'center', marginBottom: '1.25rem', textTransform: 'uppercase', position: 'relative', zIndex: 1 }}>
                            🔑 Tus Credenciales de Acceso
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '0.75rem', position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: '0.65rem', color: '#78350f', letterSpacing: 1.5, marginBottom: '0.35rem', textTransform: 'uppercase', fontWeight: 600 }}>Usuario</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, letterSpacing: 1, color: '#1a3a6b' }}>
                                    {credenciales?.username}
                                </span>
                                <button
                                    onClick={() => copiar(credenciales?.username, 'usuario')}
                                    style={{
                                        background: copiado === 'usuario' ? '#059669' : '#1a3a6b',
                                        border: 'none', color: '#fff', borderRadius: 6,
                                        padding: '0.25rem 0.65rem', fontSize: '0.72rem',
                                        fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                                    }}
                                >
                                    {copiado === 'usuario' ? '✓ Copiado' : '📋 Copiar'}
                                </button>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '0.9rem 1rem', position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: '0.65rem', color: '#78350f', letterSpacing: 1.5, marginBottom: '0.35rem', textTransform: 'uppercase', fontWeight: 600 }}>Contraseña</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, letterSpacing: 2, color: '#1a3a6b' }}>
                                    {credenciales?.password}
                                </span>
                                <button
                                    onClick={() => copiar(credenciales?.password, 'password')}
                                    style={{
                                        background: copiado === 'password' ? '#059669' : '#1a3a6b',
                                        border: 'none', color: '#fff', borderRadius: 6,
                                        padding: '0.25rem 0.65rem', fontSize: '0.72rem',
                                        fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                                    }}
                                >
                                    {copiado === 'password' ? '✓ Copiado' : '📋 Copiar'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="alert alert-warning py-2 text-start mb-4" style={{ borderRadius: 10, fontSize: '0.8rem', border: '1px solid #fde68a' }}>
                        <strong>⚠️ Importante:</strong> Guarda estas credenciales en un lugar seguro.
                        Las necesitarás para acceder al sistema.
                    </div>

                    <button
                        onClick={onLogin}
                        style={{
                            background: '#1a3a6b', color: '#fff', border: 'none',
                            borderRadius: 9, width: '100%', height: 48,
                            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(26,58,107,0.35)',
                        }}
                    >
                        Ir al Login ({countdown}s) →
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes confettiFall {
                    0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
            `}</style>
        </div>
    );
}

export default RegistroExito;
