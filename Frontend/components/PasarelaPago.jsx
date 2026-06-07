import React, { useState } from 'react';

function PasarelaPago({ datos, onExito, onVolver }) {
    const [form, setForm] = useState({ numero: '', titular: '', vencimiento: '', cvv: '' });
    const [errores, setErrores] = useState({});
    const [procesando, setProcesando] = useState(false);
    const [errorGeneral, setErrorGeneral] = useState('');

    const set = (campo, valor) => {
        setForm(f => ({ ...f, [campo]: valor }));
        setErrores(e => ({ ...e, [campo]: '' }));
    };

    const formatNumero = (v) =>
        v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

    const formatVencimiento = (v) => {
        const d = v.replace(/\D/g, '').slice(0, 4);
        return d.length >= 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
    };

    const validar = () => {
        const e = {};
        const num = form.numero.replace(/\s/g, '');
        if (num.length !== 16)      e.numero      = 'Ingrese los 16 dígitos de la tarjeta';
        if (!form.titular.trim())   e.titular     = 'Ingrese el nombre del titular';
        if (!/^\d{2}\/\d{2}$/.test(form.vencimiento)) e.vencimiento = 'Formato MM/AA';
        if (!/^\d{3}$/.test(form.cvv)) e.cvv = 'CVV de 3 dígitos';
        return e;
    };

    const handlePagar = async () => {
        const errs = validar();
        if (Object.keys(errs).length > 0) { setErrores(errs); return; }

        setProcesando(true);
        setErrorGeneral('');

        await new Promise(r => setTimeout(r, 2000));

        try {
            const res = await fetch('/api/registro/paso2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ postulacion_id: datos.postulacion_id }),
            });
            const data = await res.json();
            if (res.ok) {
                onExito(data);
            } else {
                setErrorGeneral(data.message || 'Error al procesar el pago');
            }
        } catch {
            setErrorGeneral('Error de conexión con el servidor');
        } finally {
            setProcesando(false);
        }
    };

    const numDisplay = form.numero.replace(/\s/g, '').padEnd(16, '•')
        .replace(/(.{4})/g, '$1 ').trim();

    const pasos = ['Datos', 'Documentos', 'Pago', 'Credenciales'];
    const pasosProceso = ['Datos personales', 'Documentos', 'Pago Bs. 700', 'Credenciales'];

    const labelSt = {
        fontSize: '0.77rem', fontWeight: 600, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.4px',
        marginBottom: '0.35rem', display: 'block',
    };

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
                                background: i < 2 ? '#10b981' : i === 2 ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                                color: i < 2 ? '#fff' : i === 2 ? '#1a3a6b' : 'rgba(255,255,255,0.8)',
                                borderRadius: '50%', width: 26, height: 26,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
                            }}>{i < 2 ? '✓' : i + 1}</div>
                            <span style={{
                                color: i === 2 ? '#f59e0b' : i < 2 ? '#10b981' : 'rgba(255,255,255,0.65)',
                                fontSize: '0.84rem', fontWeight: i === 2 ? 700 : 400,
                            }}>{paso}</span>
                        </div>
                    ))}

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '1.5rem 0' }} />

                    {/* Payment summary */}
                    <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '1.25rem', backdropFilter: 'blur(10px)' }}>
                        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                            Inscripción CUP {new Date().getFullYear()}
                        </div>
                        <div style={{ color: '#f59e0b', fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.35rem', lineHeight: 1 }}>
                            Bs. 700.00
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>
                            {datos?.nombres} {datos?.apellidos}
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>
                                <span>🔒</span> Pago 100% seguro
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', textAlign: 'center', marginTop: 4 }}>
                                Los datos no son procesados realmente
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{
                flexGrow: 1, background: '#fff',
                overflowY: 'auto', padding: '2.5rem 2.5rem 3rem',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
                <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '0.25rem', fontSize: '1.4rem' }}>
                            Datos de Pago
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
                            🔐 Pago simulado — los datos no son procesados realmente
                        </p>
                        <div style={{ height: 3, width: 48, background: '#f59e0b', borderRadius: 2 }} />
                    </div>

                    {/* Step progress */}
                    <div style={{ display: 'flex', marginBottom: '2rem', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        {pasos.map((s, i) => (
                            <div key={s} style={{
                                flex: 1, padding: '0.65rem 0.5rem', textAlign: 'center',
                                fontSize: '0.78rem', fontWeight: 600,
                                borderTop: `3px solid ${i < 2 ? '#10b981' : i === 2 ? '#f59e0b' : '#e2e8f0'}`,
                                color: i < 2 ? '#10b981' : i === 2 ? '#f59e0b' : '#94a3b8',
                                background: i === 2 ? '#fffbeb' : '#fff',
                                borderRight: i < pasos.length - 1 ? '1px solid #e2e8f0' : 'none',
                            }}>
                                {i < 2 ? '✓' : i === 2 ? '◉' : `${i + 1}`} {s}
                            </div>
                        ))}
                    </div>

                    {/* Credit card visual */}
                    <div style={{
                        background: 'linear-gradient(135deg, #1a237e 0%, #283593 40%, #0d47a1 100%)',
                        borderRadius: 18, padding: '1.5rem',
                        color: '#fff', position: 'relative', overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                        marginBottom: '1.75rem', minHeight: 170,
                    }}>
                        <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                        <div style={{ position: 'absolute', bottom: -40, left: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: '0.65rem', letterSpacing: 2, opacity: 0.65, fontWeight: 600 }}>
                                CUP-FICCT PAY
                            </div>
                            <div style={{ display: 'flex' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ff5722', opacity: 0.88 }} />
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ff9800', opacity: 0.88, marginLeft: -10 }} />
                            </div>
                        </div>

                        <div style={{
                            width: 40, height: 30, borderRadius: 5, marginBottom: '1rem',
                            background: 'linear-gradient(135deg, #ffd54f, #ffb300, #ffd54f)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)', position: 'relative', zIndex: 1,
                        }} />

                        <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: 3, fontWeight: 700, marginBottom: '0.9rem', position: 'relative', zIndex: 1 }}>
                            {numDisplay}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
                            <div>
                                <div style={{ fontSize: '0.55rem', opacity: 0.55, letterSpacing: 1.5, marginBottom: 2 }}>TITULAR</div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', letterSpacing: 1 }}>
                                    {form.titular.toUpperCase() || 'NOMBRE TITULAR'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.55rem', opacity: 0.55, letterSpacing: 1.5, marginBottom: 2 }}>VENCE</div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                    {form.vencimiento || 'MM/AA'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {errorGeneral && (
                        <div className="alert alert-danger py-2 small mb-3" style={{ borderRadius: 8 }}>
                            {errorGeneral}
                        </div>
                    )}

                    {/* Card number */}
                    <div className="mb-3">
                        <label style={labelSt}>Número de Tarjeta</label>
                        <input
                            type="text"
                            className={`form-control ${errores.numero ? 'is-invalid' : ''}`}
                            style={{ borderRadius: 8, fontFamily: 'monospace', letterSpacing: 2, borderColor: errores.numero ? '#ef4444' : '#e2e8f0', height: 46 }}
                            placeholder="1234 5678 9012 3456"
                            value={form.numero}
                            onChange={e => set('numero', formatNumero(e.target.value))}
                            maxLength={19}
                        />
                        {errores.numero && <div className="invalid-feedback">{errores.numero}</div>}
                    </div>

                    {/* Titular */}
                    <div className="mb-3">
                        <label style={labelSt}>Nombre del Titular</label>
                        <input
                            type="text"
                            className={`form-control ${errores.titular ? 'is-invalid' : ''}`}
                            style={{ borderRadius: 8, borderColor: errores.titular ? '#ef4444' : '#e2e8f0', height: 46 }}
                            placeholder="Como aparece en la tarjeta"
                            value={form.titular}
                            onChange={e => set('titular', e.target.value.toUpperCase())}
                        />
                        {errores.titular && <div className="invalid-feedback">{errores.titular}</div>}
                    </div>

                    <div className="row">
                        <div className="col-6">
                            <div className="mb-4">
                                <label style={labelSt}>Vencimiento</label>
                                <input
                                    type="text"
                                    className={`form-control ${errores.vencimiento ? 'is-invalid' : ''}`}
                                    style={{ borderRadius: 8, borderColor: errores.vencimiento ? '#ef4444' : '#e2e8f0', height: 46 }}
                                    placeholder="MM/AA"
                                    value={form.vencimiento}
                                    onChange={e => set('vencimiento', formatVencimiento(e.target.value))}
                                    maxLength={5}
                                />
                                {errores.vencimiento && <div className="invalid-feedback">{errores.vencimiento}</div>}
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="mb-4">
                                <label style={labelSt}>CVV</label>
                                <input
                                    type="password"
                                    className={`form-control ${errores.cvv ? 'is-invalid' : ''}`}
                                    style={{ borderRadius: 8, borderColor: errores.cvv ? '#ef4444' : '#e2e8f0', letterSpacing: 4, height: 46 }}
                                    placeholder="•••"
                                    value={form.cvv}
                                    onChange={e => set('cvv', e.target.value.replace(/\D/g, '').slice(0, 3))}
                                    maxLength={3}
                                />
                                {errores.cvv && <div className="invalid-feedback">{errores.cvv}</div>}
                            </div>
                        </div>
                    </div>

                    <button
                        style={{
                            background: procesando ? '#94a3b8' : 'linear-gradient(90deg, #059669, #10b981)',
                            color: '#fff', border: 'none', borderRadius: 9,
                            width: '100%', height: 48, fontSize: '1rem', fontWeight: 700,
                            cursor: procesando ? 'not-allowed' : 'pointer',
                            boxShadow: procesando ? 'none' : '0 4px 16px rgba(5,150,105,0.4)',
                            opacity: procesando ? 0.8 : 1,
                        }}
                        onClick={handlePagar}
                        disabled={procesando}
                    >
                        {procesando ? (
                            <><span className="spinner-border spinner-border-sm me-2" />Procesando pago...</>
                        ) : (
                            '🔒 Pagar Bs. 700.00'
                        )}
                    </button>

                    <button
                        style={{
                            background: 'transparent', border: '1.5px solid #e2e8f0',
                            color: '#64748b', borderRadius: 8, padding: '0.5rem',
                            width: '100%', cursor: 'pointer', marginTop: '0.75rem', fontSize: '0.88rem',
                        }}
                        onClick={onVolver}
                        disabled={procesando}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PasarelaPago;
