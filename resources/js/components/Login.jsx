import React, { useState } from 'react';

/**
 * CU1 - INICIAR SESIÓN
 * Diagrama de Secuencia:
 *
 * FLUJO DEL COMPONENTE:
 * Mensaje 1: ingresarCredenciales(username, password)
 *   → El usuario llena los campos del formulario
 *
 * Mensaje 1.1: solicitarAutenticacion(username, password)
 *   → handleSubmit() hace POST /api/login
 *
 * Mensaje 1.4: mostrarResultadoAutenticacion()
 *   → Recibe respuesta del AuthController
 *
 * Mensaje 1.5: [si éxito] mostrarDashboard(username, rol)
 *   → onLogin(data) → app.jsx cambia vista según rol_id
 *     rol_id=1 → Dashboard Admin
 *     rol_id=2 → PanelDocente
 *     rol_id=3 → PanelPostulante
 *
 * Mensaje 1.6: [si error] mostrarError()
 *   → setError('Credenciales incorrectas')
 */
function Login({ onLogin, onRegistro, onRegistroDocente }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);

    const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
    const [correoRecuperar, setCorreoRecuperar] = useState('');
    const [msgRecuperar, setMsgRecuperar] = useState(null);
    const [enviando, setEnviando] = useState(false);

    const [hoverLogin, setHoverLogin] = useState(false);
    const [hoverReg, setHoverReg] = useState(false);
    const [hoverDocente, setHoverDocente] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (res.ok) {
                onLogin(data);
            } else {
                setError(data.message || 'Credenciales incorrectas');
            }
        } catch {
            setError('Error de conexión con el servidor');
        }
    };

    const enviarRecuperacion = async () => {
        if (!correoRecuperar.trim()) return;
        setEnviando(true);
        setMsgRecuperar(null);
        try {
            const res = await fetch('/api/auth/recuperar-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ correo: correoRecuperar.trim() }),
            });
            const data = await res.json();
            setMsgRecuperar({ ok: res.ok, texto: data.message });
            if (res.ok) setCorreoRecuperar('');
        } catch {
            setMsgRecuperar({ ok: false, texto: 'Error de conexión. Intente nuevamente.' });
        } finally {
            setEnviando(false);
        }
    };

    const labelStyle = {
        fontSize: '0.75rem', fontWeight: 600, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: '0.4rem', display: 'block',
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

            {/* LEFT PANEL */}
            <div className="d-none d-md-flex" style={{
                flex: '0 0 50%', background: '#1a3a6b',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '3rem', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
                    backgroundSize: '28px 28px',
                }} />
                <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', bottom: -70, left: -70, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', top: '45%', left: -90, width: 260, height: 260, borderRadius: '50%', background: 'rgba(245,158,11,0.05)' }} />

                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 440 }}>
                    <div style={{
                        width: 90, height: 90, borderRadius: '50%',
                        background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.25rem', fontSize: '2.8rem', lineHeight: 1,
                    }}>🎓</div>

                    <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '2.5rem', letterSpacing: '-0.5px', marginBottom: '0.3rem' }}>
                        CUP - FICCT
                    </h1>
                    <h2 style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 400, fontSize: '1rem', marginBottom: '0.5rem' }}>
                        Sistema de Admisión Universitaria
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.84rem', lineHeight: 1.65, marginBottom: '1.75rem' }}>
                        Facultad de Ingeniería en Ciencias de la Computación<br />
                        y Telecomunicaciones — UAGRM
                    </p>

                    <div style={{ height: 2, background: '#f59e0b', width: 60, margin: '0 auto 1.75rem', borderRadius: 2 }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem 2.5rem' }}>
                        {[
                            { num: '1000+', label: 'Postulantes' },
                            { num: '15',    label: 'Grupos' },
                            { num: '4',     label: 'Carreras' },
                            { num: '192h',  label: 'Mínimo' },
                        ].map(({ num, label }) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{num}</div>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', marginTop: 5 }}>{label}</div>
                            </div>
                        ))}
                    </div>

                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', marginTop: '2.5rem', marginBottom: 0 }}>
                        UAGRM © 2026
                    </p>
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{
                flexGrow: 1, background: '#f8fafc',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '2.5rem 2rem',
            }}>
                <div style={{
                    width: '100%', maxWidth: 420,
                    background: '#fff', borderRadius: 16,
                    padding: '2.5rem', boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
                }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '0.25rem', fontSize: '1.6rem' }}>
                            Iniciar Sesión
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 0.75rem' }}>
                            Accede al sistema CUP
                        </p>
                        <div style={{ height: 3, width: 48, background: '#f59e0b', borderRadius: 2 }} />
                    </div>

                    {error && (
                        <div className="alert alert-danger py-2 small mb-3" style={{ borderRadius: 8 }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Usuario</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>👤</span>
                                <input
                                    type="text"
                                    className="form-control"
                                    style={{ paddingLeft: '2.4rem', borderRadius: 8, borderColor: '#e2e8f0', height: 46 }}
                                    placeholder="Ingrese su usuario"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '0.5rem' }}>
                            <label style={labelStyle}>Contraseña</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔒</span>
                                <input
                                    type={mostrarPassword ? 'text' : 'password'}
                                    className="form-control"
                                    style={{ paddingLeft: '2.4rem', paddingRight: '2.8rem', borderRadius: 8, borderColor: '#e2e8f0', height: 46 }}
                                    placeholder="Ingrese su contraseña"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setMostrarPassword(v => !v)}
                                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: 0 }}
                                    title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {mostrarPassword ? '🙈' : '👁'}
                                </button>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right', marginBottom: mostrarRecuperar ? '0.75rem' : '1.5rem' }}>
                            <button
                                type="button"
                                onClick={() => { setMostrarRecuperar(v => !v); setMsgRecuperar(null); setCorreoRecuperar(''); }}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}
                            >
                                {mostrarRecuperar ? 'Cancelar' : '¿Olvidó su contraseña?'}
                            </button>
                        </div>

                        {mostrarRecuperar && (
                            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '1rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
                                <p className="small text-muted mb-2">
                                    Se generará una nueva contraseña y se enviará a su correo.
                                </p>
                                <label className="form-label small fw-semibold">
                                    Correo electrónico registrado
                                </label>
                                <input
                                    type="email"
                                    className="form-control form-control-sm mb-2"
                                    style={{ borderRadius: 6 }}
                                    placeholder="correo@ejemplo.com"
                                    value={correoRecuperar}
                                    onChange={e => setCorreoRecuperar(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), enviarRecuperacion())}
                                />
                                <button
                                    type="button"
                                    className="btn btn-sm w-100"
                                    style={{ borderRadius: 6, background: 'linear-gradient(90deg,#1a3a6b,#2563eb)', color: '#fff', border: 'none' }}
                                    onClick={enviarRecuperacion}
                                    disabled={enviando || !correoRecuperar.trim()}
                                >
                                    {enviando
                                        ? <><span className="spinner-border spinner-border-sm me-1" />Enviando...</>
                                        : 'Enviar nueva contraseña'
                                    }
                                </button>
                                {msgRecuperar && (
                                    <div className={`alert alert-${msgRecuperar.ok ? 'success' : 'warning'} mt-2 py-2 small mb-0`}>
                                        {msgRecuperar.texto}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            onMouseEnter={() => setHoverLogin(true)}
                            onMouseLeave={() => setHoverLogin(false)}
                            style={{
                                background: hoverLogin ? '#152f58' : '#1a3a6b',
                                color: '#fff', border: 'none', borderRadius: 8, height: 46,
                                fontWeight: 600, fontSize: '1rem', width: '100%', cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(26,58,107,0.3)',
                            }}
                        >
                            Iniciar Sesión
                        </button>
                    </form>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>¿Primera vez en el sistema?</span>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    </div>

                    <button
                        type="button"
                        onMouseEnter={() => setHoverReg(true)}
                        onMouseLeave={() => setHoverReg(false)}
                        onClick={onRegistro}
                        style={{
                            background: hoverReg ? '#f59e0b' : 'transparent',
                            border: '2px solid #f59e0b',
                            color: hoverReg ? '#fff' : '#f59e0b',
                            borderRadius: 8, padding: '0.6rem 1.5rem', fontWeight: 700,
                            cursor: 'pointer', fontSize: '0.95rem', width: '100%',
                            marginBottom: '0.6rem',
                        }}
                    >
                        ¿Eres nuevo? Regístrate aquí →
                    </button>

                    <button
                        type="button"
                        onMouseEnter={() => setHoverDocente(true)}
                        onMouseLeave={() => setHoverDocente(false)}
                        onClick={onRegistroDocente}
                        style={{
                            background: hoverDocente ? '#0d9488' : 'transparent',
                            border: '2px solid #0d9488',
                            color: hoverDocente ? '#fff' : '#0d9488',
                            borderRadius: 8, padding: '0.6rem 1.5rem', fontWeight: 700,
                            cursor: 'pointer', fontSize: '0.95rem', width: '100%',
                        }}
                    >
                        👨‍🏫 ¿Eres docente? Regístrate aquí →
                    </button>

                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', marginTop: '1.5rem', marginBottom: 0 }}>
                        FICCT © 2026 — UAGRM
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;
