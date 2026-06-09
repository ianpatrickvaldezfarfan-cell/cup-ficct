import React, { useState } from 'react';

const AREAS_ACEPTADAS = [
    { icono: '💻', titulo: 'Computación e Informática', ejemplos: 'Ing. en Sistemas, Lic. en Informática, Desarrollo de Software, Redes, Telecomunicaciones, Ciberseguridad' },
    { icono: '📐', titulo: 'Matemáticas y Estadística', ejemplos: 'Lic. en Matemáticas, Estadística, Cálculo, Álgebra, Actuaría, Contabilidad, Ingeniería' },
    { icono: '⚗️', titulo: 'Física y Ciencias Naturales', ejemplos: 'Física, Química, Mecánica, Electromecánica, Astrofísica, Ciencias' },
    { icono: '🌐', titulo: 'Inglés e Idiomas', ejemplos: 'Lic. en Inglés, Lingüística, Filología, Traducción, Comunicación bilingüe' },
    { icono: '🎓', titulo: 'Educación y Pedagogía', ejemplos: 'Lic. en Educación, Pedagogía, Ciencias de la Docencia' },
];

function RegistroDocente({ onVolver }) {
    const [fase, setFase] = useState('form');
    const [form, setForm] = useState({
        ci: '', nombres: '', apellidos: '',
        correo: '', profesion: '',
        tiene_maestria: false, tiene_diplomado: false,
    });
    const [errores, setErrores] = useState({});
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [copiado, setCopiado] = useState('');
    const [correoRechazo, setCorreoRechazo] = useState('');

    const [confettiPieces] = useState(() =>
        Array.from({ length: 35 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 2.5,
            duration: 2.2 + Math.random() * 2,
            color: ['#f59e0b', '#2563eb', '#059669', '#ef4444', '#8b5cf6', '#0d9488'][Math.floor(Math.random() * 6)],
            size: 6 + Math.random() * 8,
        }))
    );

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const validar = () => {
        const e = {};
        if (!form.ci.trim())        e.ci        = 'Requerido';
        if (!form.nombres.trim())   e.nombres   = 'Requerido';
        if (!form.apellidos.trim()) e.apellidos = 'Requerido';
        if (!form.correo.trim())    e.correo    = 'Requerido';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) e.correo = 'Correo inválido';
        if (!form.profesion.trim()) e.profesion = 'Requerido';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const e2 = validar();
        if (Object.keys(e2).length) { setErrores(e2); return; }
        setErrores({});
        setEnviando(true);
        try {
            const res = await fetch('/api/registro/docente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setResultado(data.credenciales);
                setFase('exito');
            } else {
                setCorreoRechazo(form.correo);
                setFase('rechazo');
            }
        } catch {
            setErrores({ general: 'Error de conexión. Intente nuevamente.' });
        } finally {
            setEnviando(false);
        }
    };

    const copiar = (texto, campo) => {
        navigator.clipboard.writeText(texto).then(() => {
            setCopiado(campo);
            setTimeout(() => setCopiado(''), 2000);
        });
    };

    const labelStyle = {
        fontSize: '0.73rem', fontWeight: 600, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: '0.35rem', display: 'block',
    };

    const inputStyle = (campo) => ({
        borderRadius: 8,
        borderColor: errores[campo] ? '#ef4444' : '#e2e8f0',
        height: 44,
        boxShadow: errores[campo] ? '0 0 0 2px rgba(239,68,68,0.15)' : 'none',
    });

    // ── PANTALLA ÉXITO ────────────────────────────────────────────────────────
    if (fase === 'exito' && resultado) {
        return (
            <div style={{ minHeight: '100vh', background: '#1a3a6b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', fontFamily: "'Segoe UI', system-ui, sans-serif", position: 'relative', overflowY: 'auto' }}>

                <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: 9999, top: 0, left: 0, width: '100%', height: 0 }}>
                    {confettiPieces.map(p => (
                        <div key={p.id} style={{
                            position: 'absolute', top: -10,
                            left: `${p.left}%`,
                            width: p.size, height: p.size * 0.6,
                            background: p.color, borderRadius: 2,
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                            animationName: 'confettiFall',
                            animationTimingFunction: 'linear',
                            animationFillMode: 'forwards',
                        }} />
                    ))}
                </div>

                <div style={{ width: '100%', maxWidth: 520, position: 'relative', zIndex: 1 }}>
                    <div style={{ background: '#fff', borderRadius: 18, padding: '2.5rem', boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}>

                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: 88, height: 88, borderRadius: '50%',
                                background: '#dcfce7', margin: '0 auto 1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 0 14px #bbf7d0', fontSize: '2.5rem', lineHeight: 1,
                                animation: 'checkPop 0.5s ease-out',
                            }}>✓</div>
                            <h2 style={{ fontWeight: 800, color: '#1a3a6b', marginBottom: '0.25rem' }}>¡Bienvenido a la FICCT! 🎓</h2>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 0 }}>Tu registro como docente fue exitoso</p>
                            <div style={{ height: 3, width: 60, background: '#0d9488', borderRadius: 2, margin: '0.75rem auto 0' }} />
                        </div>

                        {/* Credentials card */}
                        <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
                            <h5 style={{ color: '#15803d', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center', margin: '0 0 1rem' }}>
                                🔑 TUS CREDENCIALES DE ACCESO
                            </h5>

                            <div style={{ marginBottom: '0.75rem' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>USUARIO</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        value={resultado.username}
                                        readOnly
                                        className="form-control"
                                        style={{ backgroundColor: '#f8f9fa', fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', borderRadius: 8, borderColor: '#bbf7d0', flex: 1 }}
                                    />
                                    <button
                                        onClick={() => copiar(resultado.username, 'usuario')}
                                        style={{ background: copiado === 'usuario' ? '#15803d' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 8, padding: '0 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0, whiteSpace: 'nowrap' }}
                                    >
                                        {copiado === 'usuario' ? '✓ Copiado' : '📋 Copiar'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>CONTRASEÑA</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        value={resultado.password}
                                        readOnly
                                        className="form-control"
                                        style={{ backgroundColor: '#f8f9fa', fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', borderRadius: 8, borderColor: '#bbf7d0', flex: 1 }}
                                    />
                                    <button
                                        onClick={() => copiar(resultado.password, 'password')}
                                        style={{ background: copiado === 'password' ? '#15803d' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 8, padding: '0 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0, whiteSpace: 'nowrap' }}
                                    >
                                        {copiado === 'password' ? '✓ Copiado' : '📋 Copiar'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#fff3cd', padding: 12, borderRadius: 8, border: '1px solid #fde68a' }}>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#78350f' }}>
                                    ⚠️ <strong>Importante:</strong> Guarda estas credenciales. Tu contraseña es tu número de CI.
                                </p>
                            </div>
                        </div>

                        {/* Docente info */}
                        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                            <p style={{ margin: '0 0 0.4rem', fontSize: '0.88rem', color: '#334155' }}>
                                👤 <strong>Nombre:</strong> {resultado.nombres} {resultado.apellidos}
                            </p>
                            <p style={{ margin: '0 0 0.4rem', fontSize: '0.88rem', color: '#334155' }}>
                                💼 <strong>Profesión:</strong> {resultado.profesion}
                            </p>
                            <p style={{ margin: '0 0 0.65rem', fontSize: '0.88rem', color: '#334155' }}>
                                📧 <strong>Correo:</strong> {resultado.correo}
                            </p>
                            <span style={{ backgroundColor: '#16a34a', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>
                                👨‍🏫 Rol: Docente
                            </span>
                        </div>

                        {/* Próximo paso */}
                        <div style={{ backgroundColor: '#e8f4fd', padding: 12, borderRadius: 8, border: '1px solid #2563eb', marginBottom: '1.5rem' }}>
                            <p style={{ margin: 0, fontSize: '0.83rem', color: '#1e40af' }}>
                                📋 <strong>Próximo paso:</strong> El administrador de la FICCT revisará tu perfil y te asignará grupos y materias según tu especialidad profesional.
                            </p>
                        </div>

                        <button onClick={onVolver} style={{
                            background: '#1a3a6b', color: '#fff', border: 'none',
                            borderRadius: 9, width: '100%', height: 48,
                            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(26,58,107,0.35)',
                        }}>
                            Ir al Login →
                        </button>
                    </div>
                </div>

                <style>{`
                    @keyframes confettiFall {
                        0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
                        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                    }
                    @keyframes checkPop {
                        0%   { transform: scale(0); }
                        70%  { transform: scale(1.15); }
                        100% { transform: scale(1); }
                    }
                `}</style>
            </div>
        );
    }

    // ── PANTALLA RECHAZO ──────────────────────────────────────────────────────
    if (fase === 'rechazo') {
        return (
            <div style={{ minHeight: '100vh', background: '#1a3a6b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                <div style={{ width: '100%', maxWidth: 520 }}>
                    <div style={{ background: '#fff', borderRadius: 18, padding: '2.5rem', boxShadow: '0 25px 80px rgba(0,0,0,0.4)', textAlign: 'center' }}>
                        <div style={{
                            width: 88, height: 88, borderRadius: '50%',
                            background: '#fee2e2', margin: '0 auto 0.75rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 0 14px #fecaca', fontSize: '2.5rem', lineHeight: 1,
                        }}>❌</div>

                        <h2 style={{ fontWeight: 800, color: '#991b1b', marginBottom: '0.25rem' }}>Solicitud no aprobada</h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                            Tu profesión no corresponde a las áreas que se enseñan en el CUP-FICCT.
                        </p>

                        <div style={{ textAlign: 'left', background: '#f8fafc', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
                            <p style={{ fontWeight: 700, color: '#1a3a6b', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                                Áreas aceptadas para docentes del CUP:
                            </p>
                            {AREAS_ACEPTADAS.map(a => (
                                <div key={a.titulo} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.55rem', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>{a.icono}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.82rem' }}>{a.titulo}</div>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem', lineHeight: 1.4 }}>{a.ejemplos}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            background: '#fffbeb', border: '1px solid #fde68a',
                            borderRadius: 10, padding: '0.9rem 1.1rem',
                            marginBottom: '1.5rem', textAlign: 'left',
                        }}>
                            <p style={{ margin: 0, fontSize: '0.83rem', color: '#78350f' }}>
                                <strong>📧 Correo enviado</strong> — Se ha notificado a <strong>{correoRechazo}</strong> con los detalles de la evaluación y los pasos a seguir.
                            </p>
                        </div>

                        <button onClick={onVolver} style={{
                            background: '#1a3a6b', color: '#fff', border: 'none',
                            borderRadius: 9, width: '100%', height: 46,
                            fontSize: '0.97rem', fontWeight: 700, cursor: 'pointer',
                        }}>
                            ← Volver al Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── FORMULARIO ────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

            {/* LEFT PANEL */}
            <div className="d-none d-md-flex" style={{
                flex: '0 0 42%', background: '#1a3a6b',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '3rem 2.5rem', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1.5px, transparent 1.5px)',
                    backgroundSize: '28px 28px',
                }} />
                <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', bottom: -70, left: -70, width: 220, height: 220, borderRadius: '50%', background: 'rgba(13,148,136,0.08)' }} />

                <div style={{ position: 'relative', zIndex: 1, maxWidth: 360, width: '100%' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'rgba(13,148,136,0.2)', border: '2px solid rgba(13,148,136,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.25rem', fontSize: '2.4rem', lineHeight: 1,
                    }}>👨‍🏫</div>

                    <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.8rem', textAlign: 'center', marginBottom: '0.3rem' }}>
                        Registro Docente
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.83rem', textAlign: 'center', marginBottom: '1.75rem' }}>
                        CUP — Facultad de Ingeniería FICCT · UAGRM
                    </p>
                    <div style={{ height: 2, background: '#0d9488', width: 56, margin: '0 auto 1.75rem', borderRadius: 2 }} />

                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Áreas aceptadas
                    </p>

                    {AREAS_ACEPTADAS.map(a => (
                        <div key={a.titulo} style={{
                            background: 'rgba(255,255,255,0.06)', borderRadius: 10,
                            padding: '0.7rem 0.9rem', marginBottom: '0.6rem',
                            border: '1px solid rgba(255,255,255,0.09)',
                            display: 'flex', gap: '0.65rem', alignItems: 'flex-start',
                        }}>
                            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{a.icono}</span>
                            <div>
                                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.82rem' }}>{a.titulo}</div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', lineHeight: 1.4, marginTop: 2 }}>{a.ejemplos}</div>
                            </div>
                        </div>
                    ))}

                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', textAlign: 'center', marginTop: '1.5rem', marginBottom: 0 }}>
                        UAGRM © 2026
                    </p>
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{
                flexGrow: 1, background: '#f8fafc',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '2.5rem 1.5rem', overflowY: 'auto',
            }}>
                <div style={{
                    width: '100%', maxWidth: 500,
                    background: '#fff', borderRadius: 16,
                    padding: '2.5rem', boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
                }}>
                    <div style={{ marginBottom: '1.75rem' }}>
                        <button onClick={onVolver} style={{
                            background: 'none', border: 'none', color: '#64748b',
                            fontSize: '0.82rem', cursor: 'pointer', padding: 0, marginBottom: '0.75rem',
                        }}>
                            ← Volver al Login
                        </button>
                        <h3 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '0.2rem', fontSize: '1.5rem' }}>
                            Solicitud Docente
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                            Completa el formulario para unirte al equipo del CUP
                        </p>
                        <div style={{ height: 3, width: 48, background: '#0d9488', borderRadius: 2, marginTop: '0.75rem' }} />
                    </div>

                    {errores.general && (
                        <div className="alert alert-danger py-2 small mb-3" style={{ borderRadius: 8 }}>
                            {errores.general}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="row g-3" style={{ marginBottom: '0.25rem' }}>
                            <div className="col-md-6">
                                <label style={labelStyle}>CI / Carnet de Identidad</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    style={inputStyle('ci')}
                                    placeholder="Ej: 12345678"
                                    value={form.ci}
                                    onChange={e => set('ci', e.target.value)}
                                />
                                {errores.ci && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 3 }}>{errores.ci}</div>}
                            </div>
                            <div className="col-md-6">
                                <label style={labelStyle}>Correo Electrónico</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    style={inputStyle('correo')}
                                    placeholder="docente@ejemplo.com"
                                    value={form.correo}
                                    onChange={e => set('correo', e.target.value)}
                                />
                                {errores.correo && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 3 }}>{errores.correo}</div>}
                            </div>
                        </div>

                        <div className="row g-3" style={{ marginTop: '0.1rem', marginBottom: '0.25rem' }}>
                            <div className="col-md-6">
                                <label style={labelStyle}>Nombres</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    style={inputStyle('nombres')}
                                    placeholder="Ej: Juan Carlos"
                                    value={form.nombres}
                                    onChange={e => set('nombres', e.target.value)}
                                />
                                {errores.nombres && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 3 }}>{errores.nombres}</div>}
                            </div>
                            <div className="col-md-6">
                                <label style={labelStyle}>Apellidos</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    style={inputStyle('apellidos')}
                                    placeholder="Ej: Pérez Mamani"
                                    value={form.apellidos}
                                    onChange={e => set('apellidos', e.target.value)}
                                />
                                {errores.apellidos && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 3 }}>{errores.apellidos}</div>}
                            </div>
                        </div>

                        <div style={{ marginTop: '0.75rem', marginBottom: '1rem' }}>
                            <label style={labelStyle}>Profesión / Título Académico</label>
                            <input
                                type="text"
                                className="form-control"
                                style={{ ...inputStyle('profesion'), height: 44 }}
                                placeholder="Ej: Ingeniero en Sistemas, Lic. en Matemáticas, Profesor de Inglés..."
                                value={form.profesion}
                                onChange={e => set('profesion', e.target.value)}
                            />
                            {errores.profesion
                                ? <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 3 }}>{errores.profesion}</div>
                                : <div style={{ color: '#94a3b8', fontSize: '0.73rem', marginTop: 4 }}>Escribe tu título tal como aparece en tu diploma</div>
                            }
                        </div>

                        <div style={{
                            background: '#f8fafc', borderRadius: 10,
                            padding: '1rem 1.1rem', marginBottom: '1.5rem',
                            border: '1px solid #e2e8f0',
                        }}>
                            <p style={{ fontWeight: 600, color: '#1a3a6b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '0.75rem' }}>
                                Formación adicional
                            </p>
                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                {[
                                    { key: 'tiene_maestria', label: '🎓 Tiene Maestría' },
                                    { key: 'tiene_diplomado', label: '📜 Tiene Diplomado' },
                                ].map(({ key, label }) => (
                                    <label key={key} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        cursor: 'pointer', fontSize: '0.88rem', color: '#334155',
                                        fontWeight: form[key] ? 600 : 400,
                                    }}>
                                        <div
                                            onClick={() => set(key, !form[key])}
                                            style={{
                                                width: 20, height: 20, borderRadius: 5,
                                                border: `2px solid ${form[key] ? '#0d9488' : '#cbd5e1'}`,
                                                background: form[key] ? '#0d9488' : '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', flexShrink: 0,
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {form[key] && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>✓</span>}
                                        </div>
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={enviando}
                            style={{
                                background: enviando ? '#94a3b8' : 'linear-gradient(135deg, #0d9488, #0f766e)',
                                color: '#fff', border: 'none', borderRadius: 9,
                                height: 48, width: '100%', fontWeight: 700,
                                fontSize: '1rem', cursor: enviando ? 'not-allowed' : 'pointer',
                                boxShadow: enviando ? 'none' : '0 4px 16px rgba(13,148,136,0.35)',
                            }}
                        >
                            {enviando
                                ? <span><span className="spinner-border spinner-border-sm me-2" />Enviando solicitud...</span>
                                : '👨‍🏫 Enviar Solicitud de Registro'
                            }
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.73rem', marginTop: '1.25rem', marginBottom: 0 }}>
                        Tu profesión será evaluada automáticamente. Recibirás respuesta inmediata.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default RegistroDocente;
