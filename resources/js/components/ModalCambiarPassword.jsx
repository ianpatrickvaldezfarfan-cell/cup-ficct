import React, { useState } from 'react';

const REQUISITOS = [
    { key: 'longitud',  label: 'Mínimo 8 caracteres',             test: p => p.length >= 8 },
    { key: 'mayuscula', label: 'Al menos una mayúscula (A-Z)',     test: p => /[A-Z]/.test(p) },
    { key: 'minuscula', label: 'Al menos una minúscula (a-z)',     test: p => /[a-z]/.test(p) },
    { key: 'numero',    label: 'Al menos un número (0-9)',         test: p => /[0-9]/.test(p) },
    { key: 'especial',  label: 'Al menos un carácter especial (@#$%&*!)', test: p => /[@#$%&*!]/.test(p) },
];

function validar(pwd) {
    const r = {};
    REQUISITOS.forEach(({ key, test }) => { r[key] = test(pwd); });
    r.valida = Object.values(r).every(Boolean);
    return r;
}

function OjoBtn({ mostrar, onToggle }) {
    return (
        <button type="button" tabIndex={-1} onClick={onToggle}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0, color: '#94a3b8' }}>
            {mostrar ? '🙈' : '👁'}
        </button>
    );
}

export default function ModalCambiarPassword({ userId, onClose }) {
    const [form, setForm]     = useState({ actual: '', nueva: '', confirmar: '' });
    const [ver, setVer]       = useState({ actual: false, nueva: false, confirmar: false });
    const [guardando, setGuardando] = useState(false);
    const [error, setError]   = useState('');
    const [toast, setToast]   = useState('');

    const req  = validar(form.nueva);
    const match = form.confirmar.length > 0 && form.nueva !== form.confirmar;
    const puedeGuardar = form.actual.trim() && req.valida && form.nueva === form.confirmar && form.confirmar.length > 0;

    const fortaleza = Object.values(req).filter(v => v === true).length - (req.valida ? 0 : 0);
    const numCumple = REQUISITOS.filter(({ key }) => req[key]).length;
    const colorBarra = numCumple <= 2 ? '#ef4444' : numCumple <= 4 ? '#f59e0b' : '#16a34a';

    async function guardar() {
        setGuardando(true); setError('');
        try {
            const res = await fetch('/api/postulante/cambiar-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-User-Id': userId },
                body: JSON.stringify({ password_actual: form.actual, password_nueva: form.nueva, password_confirmacion: form.confirmar }),
            });
            const data = await res.json();
            if (data.success) {
                setToast('✓ Contraseña actualizada correctamente');
                setTimeout(() => { setToast(''); onClose(); }, 1800);
            } else {
                setError(data.mensaje || 'Error al actualizar');
            }
        } catch {
            setError('Error de conexión. Intente nuevamente.');
        } finally {
            setGuardando(false);
        }
    }

    const inputWrap = { position: 'relative' };
    const inputStyle = (err) => ({
        paddingRight: '2.4rem', borderRadius: 8,
        borderColor: err ? '#ef4444' : '#e2e8f0',
        height: 42, fontSize: '0.88rem',
    });
    const labelStyle = { fontSize: '0.73rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, #1a3a6b, #2563eb)', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>🔒 Cambiar Contraseña</div>
                        <div style={{ color: '#bfdbfe', fontSize: 11, marginTop: 2 }}>Elige una contraseña segura</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontSize: 13 }}>✕</button>
                </div>

                <div style={{ padding: '20px 22px 22px' }}>

                    {toast && (
                        <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
                            {toast}
                        </div>
                    )}
                    {error && (
                        <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                            {error}
                        </div>
                    )}

                    {/* Contraseña actual */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={labelStyle}>Contraseña actual *</label>
                        <div style={inputWrap}>
                            <input
                                type={ver.actual ? 'text' : 'password'}
                                className="form-control"
                                style={inputStyle(false)}
                                placeholder="Ingresa tu contraseña actual"
                                value={form.actual}
                                onChange={e => setForm(f => ({ ...f, actual: e.target.value }))}
                            />
                            <OjoBtn mostrar={ver.actual} onToggle={() => setVer(v => ({ ...v, actual: !v.actual }))} />
                        </div>
                    </div>

                    {/* Nueva contraseña */}
                    <div style={{ marginBottom: 8 }}>
                        <label style={labelStyle}>Nueva contraseña *</label>
                        <div style={inputWrap}>
                            <input
                                type={ver.nueva ? 'text' : 'password'}
                                className="form-control"
                                style={inputStyle(false)}
                                placeholder="Mínimo 8 caracteres"
                                value={form.nueva}
                                onChange={e => setForm(f => ({ ...f, nueva: e.target.value }))}
                            />
                            <OjoBtn mostrar={ver.nueva} onToggle={() => setVer(v => ({ ...v, nueva: !v.nueva }))} />
                        </div>
                    </div>

                    {/* Barra de fortaleza */}
                    {form.nueva.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                                {REQUISITOS.map((_, i) => (
                                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < numCumple ? colorBarra : '#e2e8f0', transition: 'background 0.2s' }} />
                                ))}
                            </div>
                            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                                {REQUISITOS.map(({ key, label }) => (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, fontSize: '0.75rem' }}>
                                        <span style={{ color: req[key] ? '#16a34a' : '#ef4444', fontWeight: 700, fontSize: '0.8rem' }}>
                                            {req[key] ? '✓' : '✗'}
                                        </span>
                                        <span style={{ color: req[key] ? '#15803d' : '#dc2626' }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Confirmar */}
                    <div style={{ marginBottom: 18 }}>
                        <label style={labelStyle}>Confirmar nueva contraseña *</label>
                        <div style={inputWrap}>
                            <input
                                type={ver.confirmar ? 'text' : 'password'}
                                className="form-control"
                                style={inputStyle(match)}
                                placeholder="Repite la nueva contraseña"
                                value={form.confirmar}
                                onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
                            />
                            <OjoBtn mostrar={ver.confirmar} onToggle={() => setVer(v => ({ ...v, confirmar: !v.confirmar }))} />
                        </div>
                        {match && (
                            <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4 }}>Las contraseñas no coinciden</div>
                        )}
                        {form.confirmar.length > 0 && !match && form.nueva === form.confirmar && (
                            <div style={{ color: '#16a34a', fontSize: '0.75rem', marginTop: 4 }}>✓ Las contraseñas coinciden</div>
                        )}
                    </div>

                    {/* Botones */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={guardar}
                            disabled={!puedeGuardar || guardando}
                            style={{
                                flex: 1, height: 42, borderRadius: 8, border: 'none',
                                background: puedeGuardar && !guardando ? 'linear-gradient(90deg, #1a3a6b, #2563eb)' : '#e2e8f0',
                                color: puedeGuardar && !guardando ? '#fff' : '#94a3b8',
                                fontWeight: 700, fontSize: '0.9rem',
                                cursor: puedeGuardar && !guardando ? 'pointer' : 'not-allowed',
                                boxShadow: puedeGuardar && !guardando ? '0 3px 10px rgba(37,99,235,0.3)' : 'none',
                            }}
                        >
                            {guardando ? <span><span className="spinner-border spinner-border-sm me-1" />Guardando...</span> : '💾 Guardar Contraseña'}
                        </button>
                        <button
                            onClick={onClose}
                            style={{ height: 42, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.9rem', padding: '0 18px', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
