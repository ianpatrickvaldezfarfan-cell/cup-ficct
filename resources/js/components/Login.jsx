import React, { useState } from 'react';

/**
 * Componente de inicio de sesion del sistema CUP-FICCT.
 *
 * Presenta un formulario de autenticacion con soporte para:
 * - Mostrar/ocultar contrasena con icono de ojo
 * - Recuperacion de contrasena via correo electronico (POST /api/auth/recuperar-password)
 * - Enlace al formulario de registro publico de nuevos postulantes
 *
 * @param {Function} onLogin    Callback que recibe los datos del usuario autenticado
 * @param {Function} onRegistro Callback para navegar al flujo de registro publico
 */
function Login({ onLogin, onRegistro }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);

    const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
    const [correoRecuperar, setCorreoRecuperar] = useState('');
    const [msgRecuperar, setMsgRecuperar] = useState(null); // { ok, texto }
    const [enviando, setEnviando] = useState(false);

    /**
     * Envia las credenciales a POST /api/login.
     * Si la respuesta es exitosa, llama a onLogin(data) para iniciar la sesion en el frontend.
     * En caso de error, muestra el mensaje de credenciales incorrectas.
     */
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

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="card shadow" style={{ width: '420px' }}>
                <div className="card-body p-5">
                    <div className="text-center mb-4">
                        <h2 className="fw-bold text-primary">CUP - FICCT</h2>
                        <p className="text-muted">Sistema de Admisión Universitaria</p>
                    </div>

                    {error && <div className="alert alert-danger py-2">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label fw-semibold">Usuario</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Ingrese su usuario"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="mb-2">
                            <label className="form-label fw-semibold">Contraseña</label>
                            <div className="position-relative">
                                <input
                                    type={mostrarPassword ? 'text' : 'password'}
                                    className="form-control pe-5"
                                    placeholder="Ingrese su contraseña"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setMostrarPassword(v => !v)}
                                    className="btn btn-sm border-0 bg-transparent position-absolute top-50 end-0 translate-middle-y me-1 text-muted p-1"
                                    style={{ fontSize: '1.1rem', lineHeight: 1 }}
                                    title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {mostrarPassword ? '🙈' : '👁'}
                                </button>
                            </div>
                        </div>

                        {/* Link recuperar contraseña */}
                        <div className="mb-4 text-end">
                            <button
                                type="button"
                                className="btn btn-link btn-sm p-0 text-decoration-none text-secondary"
                                onClick={() => {
                                    setMostrarRecuperar(v => !v);
                                    setMsgRecuperar(null);
                                    setCorreoRecuperar('');
                                }}
                            >
                                {mostrarRecuperar ? 'Cancelar' : '¿Olvidó su contraseña?'}
                            </button>
                        </div>

                        {/* Formulario de recuperación */}
                        {mostrarRecuperar && (
                            <div className="mb-4 p-3 bg-light rounded border">
                                <p className="small text-muted mb-2">
                                    Se generará una nueva contraseña y se enviará a su correo.
                                </p>
                                <label className="form-label small fw-semibold">
                                    Correo electrónico registrado
                                </label>
                                <input
                                    type="email"
                                    className="form-control form-control-sm mb-2"
                                    placeholder="correo@ejemplo.com"
                                    value={correoRecuperar}
                                    onChange={e => setCorreoRecuperar(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), enviarRecuperacion())}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm w-100"
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

                        <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold">
                            Iniciar Sesión
                        </button>
                    </form>

                    <hr className="my-4" />

                    <div className="text-center">
                        <p className="text-muted small mb-2">¿Primera vez en el sistema?</p>
                        <button
                            type="button"
                            className="btn btn-outline-primary w-100"
                            onClick={onRegistro}
                        >
                            ¿Eres nuevo? Regístrate aquí →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
