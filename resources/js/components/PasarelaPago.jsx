import React, { useState } from 'react';

/**
 * Paso 3 del flujo de registro publico - Pasarela de Pago Simulada.
 *
 * IMPORTANTE: Este componente es una SIMULACION de pago con fines educativos.
 * Los datos de tarjeta ingresados NO son procesados ni transmitidos a ningun
 * servicio financiero real. El formulario solo valida formato local.
 *
 * Simula el procesamiento con un delay de 2 segundos (setTimeout) antes de
 * llamar a POST /api/registro/paso2 con { postulacion_id }.
 *
 * El backend (paso2) al recibir la solicitud:
 * 1. Registra el pago en tabla 'pagos' con estado COMPLETADO
 * 2. Genera username y password aleatorio para el nuevo usuario
 * 3. Crea el usuario con rol_id=3 (postulante)
 * 4. Vincula usuario al postulante
 * 5. Actualiza estado de postulacion a 'EN PROCESO'
 *
 * @param {Object}   datos    { postulacion_id, nombres, apellidos, monto }
 * @param {Function} onExito  Callback con { username, password, mensaje }
 * @param {Function} onVolver Callback para regresar al paso de documentos
 */
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

        // Simular 2 segundos de procesamiento bancario
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

    // Mostrar número enmascarado en la tarjeta visual
    const numDisplay = form.numero.replace(/\s/g, '').padEnd(16, '•')
        .replace(/(.{4})/g, '$1 ').trim();

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center py-4"
             style={{ background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 50%, #42a5f5 100%)' }}>
            <div style={{ width: '100%', maxWidth: 480 }} className="px-3">

                {/* Indicador de pasos */}
                <div className="d-flex justify-content-center gap-2 mb-4">
                    {['Datos', 'Documentos', 'Pago', 'Credenciales'].map((s, i) => (
                        <span key={i} className={`badge rounded-pill px-3 py-2 ${i === 2 ? 'bg-warning text-dark' : 'bg-white bg-opacity-25 text-white'}`}>
                            {i + 1}. {s}
                        </span>
                    ))}
                </div>

                {/* Tarjeta bancaria visual */}
                <div className="rounded-4 p-4 mb-4 text-white position-relative overflow-hidden"
                     style={{
                         background: 'linear-gradient(135deg, #1a237e, #283593, #0d47a1)',
                         boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                         minHeight: 180,
                     }}>
                    {/* Círculos decorativos */}
                    <div className="position-absolute" style={{
                        width: 200, height: 200, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        top: -60, right: -60,
                    }} />
                    <div className="position-absolute" style={{
                        width: 120, height: 120, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        bottom: -40, left: -20,
                    }} />

                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <div className="fw-bold" style={{ fontSize: '0.7rem', letterSpacing: 2, opacity: 0.7 }}>
                                CUP-FICCT PAY
                            </div>
                        </div>
                        <div className="d-flex gap-1">
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ff5722', opacity: 0.85 }} />
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ff9800', opacity: 0.85, marginLeft: -12 }} />
                        </div>
                    </div>

                    {/* Chip simulado */}
                    <div className="mb-3" style={{
                        width: 40, height: 30, borderRadius: 4,
                        background: 'linear-gradient(135deg, #ffd54f, #ffb300)',
                    }} />

                    <div className="fw-bold mb-2" style={{ fontSize: '1.2rem', letterSpacing: 3, fontFamily: 'monospace' }}>
                        {numDisplay}
                    </div>

                    <div className="d-flex justify-content-between align-items-end">
                        <div>
                            <div style={{ fontSize: '0.6rem', opacity: 0.6, letterSpacing: 1 }}>TITULAR</div>
                            <div className="fw-semibold" style={{ fontSize: '0.85rem' }}>
                                {form.titular.toUpperCase() || 'NOMBRE TITULAR'}
                            </div>
                        </div>
                        <div className="text-end">
                            <div style={{ fontSize: '0.6rem', opacity: 0.6, letterSpacing: 1 }}>VENCE</div>
                            <div className="fw-semibold" style={{ fontSize: '0.85rem' }}>
                                {form.vencimiento || 'MM/AA'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel de pago */}
                <div className="card shadow-lg border-0 rounded-4">
                    <div className="card-body p-4">
                        {/* Resumen */}
                        <div className="bg-light rounded-3 p-3 mb-4 text-center">
                            <div className="small text-muted">Inscripción CUP {new Date().getFullYear()}</div>
                            <div className="fw-bold text-primary" style={{ fontSize: '1.5rem' }}>Bs. 700.00</div>
                            <div className="small text-muted">
                                {datos?.nombres} {datos?.apellidos}
                            </div>
                        </div>

                        {errorGeneral && <div className="alert alert-danger py-2 small">{errorGeneral}</div>}

                        {/* Número de tarjeta */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold small">Número de Tarjeta</label>
                            <input
                                type="text"
                                className={`form-control ${errores.numero ? 'is-invalid' : ''}`}
                                placeholder="1234 5678 9012 3456"
                                value={form.numero}
                                onChange={e => set('numero', formatNumero(e.target.value))}
                                maxLength={19}
                                style={{ fontFamily: 'monospace', letterSpacing: 2 }}
                            />
                            {errores.numero && <div className="invalid-feedback">{errores.numero}</div>}
                        </div>

                        {/* Nombre titular */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold small">Nombre del Titular</label>
                            <input
                                type="text"
                                className={`form-control ${errores.titular ? 'is-invalid' : ''}`}
                                placeholder="Como aparece en la tarjeta"
                                value={form.titular}
                                onChange={e => set('titular', e.target.value.toUpperCase())}
                            />
                            {errores.titular && <div className="invalid-feedback">{errores.titular}</div>}
                        </div>

                        <div className="row">
                            <div className="col-6">
                                <div className="mb-3">
                                    <label className="form-label fw-semibold small">Vencimiento</label>
                                    <input
                                        type="text"
                                        className={`form-control ${errores.vencimiento ? 'is-invalid' : ''}`}
                                        placeholder="MM/AA"
                                        value={form.vencimiento}
                                        onChange={e => set('vencimiento', formatVencimiento(e.target.value))}
                                        maxLength={5}
                                    />
                                    {errores.vencimiento && <div className="invalid-feedback">{errores.vencimiento}</div>}
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="mb-3">
                                    <label className="form-label fw-semibold small">CVV</label>
                                    <input
                                        type="password"
                                        className={`form-control ${errores.cvv ? 'is-invalid' : ''}`}
                                        placeholder="•••"
                                        value={form.cvv}
                                        onChange={e => set('cvv', e.target.value.replace(/\D/g, '').slice(0, 3))}
                                        maxLength={3}
                                    />
                                    {errores.cvv && <div className="invalid-feedback">{errores.cvv}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="d-grid gap-2">
                            <button
                                className="btn btn-success fw-bold py-2"
                                onClick={handlePagar}
                                disabled={procesando}
                                style={{ fontSize: '1.05rem' }}
                            >
                                {procesando ? (
                                    <><span className="spinner-border spinner-border-sm me-2" />Procesando pago...</>
                                ) : (
                                    '🔒 Pagar Bs. 700.00'
                                )}
                            </button>
                            <button className="btn btn-outline-secondary" onClick={onVolver} disabled={procesando}>
                                Cancelar
                            </button>
                        </div>

                        <p className="text-center text-muted small mt-3 mb-0">
                            🔐 Pago simulado — datos no son procesados realmente
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PasarelaPago;
