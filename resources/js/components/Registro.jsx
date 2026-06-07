import React, { useState, useEffect } from 'react';

function Registro({ onDocumentos, onVolver }) {
    const [carreras, setCarreras] = useState([]);
    const [enviando, setEnviando] = useState(false);
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState('');

    const [form, setForm] = useState({
        ci: '', nombres: '', apellidos: '', fecha_nac: '', genero: '',
        telefono: '', correo: '', direccion: '', ciudad: '',
        colegio_procedencia: '', carrera_opcion1_id: '', carrera_opcion2_id: '',
    });

    useEffect(() => {
        fetch('/api/carreras')
            .then(r => r.json())
            .then(setCarreras)
            .catch(() => {});
    }, []);

    const set = (campo, valor) => {
        setForm(f => ({ ...f, [campo]: valor }));
        setErrores(e => ({ ...e, [campo]: '' }));
    };

    const validar = () => {
        const e = {};
        if (!form.ci.trim())        e.ci        = 'El CI es obligatorio';
        if (!form.nombres.trim())   e.nombres   = 'Los nombres son obligatorios';
        if (!form.apellidos.trim()) e.apellidos = 'Los apellidos son obligatorios';
        if (!form.fecha_nac)        e.fecha_nac = 'La fecha de nacimiento es obligatoria';
        if (!form.genero)           e.genero    = 'Seleccione un género';
        if (!form.correo.trim())    e.correo    = 'El correo es obligatorio';
        if (form.correo && !/\S+@\S+\.\S+/.test(form.correo)) e.correo = 'Correo inválido';
        if (!form.carrera_opcion1_id) e.carrera_opcion1_id = 'Seleccione la opción 1';
        if (!form.carrera_opcion2_id) e.carrera_opcion2_id = 'Seleccione la opción 2';
        if (form.carrera_opcion1_id && form.carrera_opcion2_id &&
            form.carrera_opcion1_id === form.carrera_opcion2_id) {
            e.carrera_opcion2_id = 'La opción 2 debe ser diferente a la opción 1';
        }
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validar();
        if (Object.keys(errs).length > 0) { setErrores(errs); return; }

        setEnviando(true);
        setErrorGeneral('');
        try {
            const res = await fetch('/api/registro/paso1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    carrera_opcion1_id: parseInt(form.carrera_opcion1_id),
                    carrera_opcion2_id: parseInt(form.carrera_opcion2_id),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                onDocumentos(data);
            } else {
                if (data.errors) {
                    const mapped = {};
                    Object.entries(data.errors).forEach(([k, v]) => { mapped[k] = v[0]; });
                    setErrores(mapped);
                } else {
                    setErrorGeneral(data.message || 'Error al registrar');
                }
            }
        } catch {
            setErrorGeneral('Error de conexión con el servidor');
        } finally {
            setEnviando(false);
        }
    };

    const labelSt = {
        fontSize: '0.78rem', fontWeight: 600, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.4px',
        marginBottom: '0.35rem', display: 'block',
    };

    const campo = (label, key, type = 'text', req = false) => (
        <div className="mb-3">
            <label style={labelSt}>
                {label}{req && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
            </label>
            <input
                type={type}
                className={`form-control ${errores[key] ? 'is-invalid' : ''}`}
                style={{ borderRadius: 8, borderColor: errores[key] ? '#ef4444' : '#e2e8f0', fontSize: '0.9rem' }}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
            />
            {errores[key] && <div className="invalid-feedback">{errores[key]}</div>}
        </div>
    );

    const pasos = ['Datos', 'Documentos', 'Pago', 'Credenciales'];
    const pasosProceso = ['Datos personales', 'Documentos', 'Pago Bs. 700', 'Credenciales'];
    const beneficios = [
        'Acceso a 4 carreras de ingeniería',
        'Grupos con horarios flexibles',
        'Seguimiento en línea de tu admisión',
        'Credenciales generadas automáticamente',
    ];

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
                        Únete al CUP 2026
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.84rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                        Facultad de Ingeniería — UAGRM
                    </p>

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', marginBottom: '1.5rem' }} />

                    <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.72rem', marginBottom: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Beneficios
                    </p>
                    {beneficios.map(b => (
                        <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '0.75rem' }}>
                            <div style={{
                                background: 'rgba(16,185,129,0.2)', color: '#10b981',
                                borderRadius: '50%', width: 22, height: 22,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: 1,
                            }}>✓</div>
                            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.84rem', lineHeight: 1.5 }}>{b}</span>
                        </div>
                    ))}

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '1.5rem 0' }} />

                    <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.72rem', marginBottom: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Proceso
                    </p>
                    {pasosProceso.map((paso, i) => (
                        <div key={paso} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.7rem' }}>
                            <div style={{
                                background: i === 0 ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                                color: i === 0 ? '#1a3a6b' : 'rgba(255,255,255,0.8)',
                                borderRadius: '50%', width: 26, height: 26,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
                            }}>{i + 1}</div>
                            <span style={{
                                color: i === 0 ? '#f59e0b' : 'rgba(255,255,255,0.78)',
                                fontSize: '0.84rem', fontWeight: i === 0 ? 700 : 400,
                            }}>{paso}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{
                flexGrow: 1, background: '#fff',
                overflowY: 'auto', padding: '2.5rem 2.5rem 3rem',
            }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '0.25rem', fontSize: '1.4rem' }}>
                            Formulario de Inscripción
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 0.75rem' }}>
                            Complete todos los campos requeridos para continuar
                        </p>
                        <div style={{ height: 3, width: 48, background: '#f59e0b', borderRadius: 2 }} />
                    </div>

                    {/* Step progress bar */}
                    <div style={{ display: 'flex', marginBottom: '2rem', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        {pasos.map((s, i) => (
                            <div key={s} style={{
                                flex: 1, padding: '0.65rem 0.5rem', textAlign: 'center',
                                fontSize: '0.78rem', fontWeight: 600,
                                borderTop: `3px solid ${i === 0 ? '#f59e0b' : '#e2e8f0'}`,
                                color: i === 0 ? '#f59e0b' : '#94a3b8',
                                background: i === 0 ? '#fffbeb' : '#fff',
                                borderRight: i < pasos.length - 1 ? '1px solid #e2e8f0' : 'none',
                            }}>
                                {i === 0 ? '◉' : `${i + 1}`} {s}
                            </div>
                        ))}
                    </div>

                    {errorGeneral && (
                        <div className="alert alert-danger" style={{ borderRadius: 10 }}>{errorGeneral}</div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Datos Personales */}
                        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8edf5', marginBottom: '1.25rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ background: 'linear-gradient(90deg, #1a3a6b, #2563eb)', padding: '0.7rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1rem' }}>👤</span>
                                <h6 style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>Datos Personales</h6>
                            </div>
                            <div className="card-body p-3">
                                <div className="row">
                                    <div className="col-md-4">{campo('Cédula de Identidad (CI)', 'ci', 'text', true)}</div>
                                    <div className="col-md-4">{campo('Nombres', 'nombres', 'text', true)}</div>
                                    <div className="col-md-4">{campo('Apellidos', 'apellidos', 'text', true)}</div>
                                </div>
                                <div className="row">
                                    <div className="col-md-4">{campo('Fecha de Nacimiento', 'fecha_nac', 'date', true)}</div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label style={labelSt}>Género <span style={{ color: '#ef4444' }}>*</span></label>
                                            <select
                                                className={`form-select ${errores.genero ? 'is-invalid' : ''}`}
                                                style={{ borderRadius: 8, borderColor: errores.genero ? '#ef4444' : '#e2e8f0', fontSize: '0.9rem' }}
                                                value={form.genero}
                                                onChange={e => set('genero', e.target.value)}
                                            >
                                                <option value="">Seleccionar...</option>
                                                <option value="M">Masculino</option>
                                                <option value="F">Femenino</option>
                                                <option value="O">Otro</option>
                                            </select>
                                            {errores.genero && <div className="invalid-feedback">{errores.genero}</div>}
                                        </div>
                                    </div>
                                    <div className="col-md-4">{campo('Teléfono', 'telefono', 'tel')}</div>
                                </div>
                                <div className="row">
                                    <div className="col-md-6">{campo('Correo Electrónico', 'correo', 'email', true)}</div>
                                    <div className="col-md-6">{campo('Dirección', 'direccion')}</div>
                                </div>
                                <div className="row">
                                    <div className="col-md-6">{campo('Ciudad', 'ciudad')}</div>
                                </div>
                            </div>
                        </div>

                        {/* Procedencia Académica */}
                        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8edf5', marginBottom: '1.25rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ background: 'linear-gradient(90deg, #1a3a6b, #2563eb)', padding: '0.7rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1rem' }}>🏫</span>
                                <h6 style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>Procedencia Académica</h6>
                            </div>
                            <div className="card-body p-3">
                                {campo('Colegio de Procedencia', 'colegio_procedencia')}
                            </div>
                        </div>

                        {/* Opciones de Carrera */}
                        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8edf5', marginBottom: '1.5rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ background: 'linear-gradient(90deg, #1a3a6b, #2563eb)', padding: '0.7rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1rem' }}>🎓</span>
                                <h6 style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>Opciones de Carrera</h6>
                            </div>
                            <div className="card-body p-3">
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label style={labelSt}>Carrera Opción 1 <span style={{ color: '#ef4444' }}>*</span></label>
                                            <select
                                                className={`form-select ${errores.carrera_opcion1_id ? 'is-invalid' : ''}`}
                                                style={{ borderRadius: 8, borderColor: errores.carrera_opcion1_id ? '#ef4444' : '#e2e8f0', fontSize: '0.9rem' }}
                                                value={form.carrera_opcion1_id}
                                                onChange={e => set('carrera_opcion1_id', e.target.value)}
                                            >
                                                <option value="">Seleccionar carrera...</option>
                                                {carreras.map(c => (
                                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                                ))}
                                            </select>
                                            {errores.carrera_opcion1_id && <div className="invalid-feedback">{errores.carrera_opcion1_id}</div>}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label style={labelSt}>Carrera Opción 2 <span style={{ color: '#ef4444' }}>*</span></label>
                                            <select
                                                className={`form-select ${errores.carrera_opcion2_id ? 'is-invalid' : ''}`}
                                                style={{ borderRadius: 8, borderColor: errores.carrera_opcion2_id ? '#ef4444' : '#e2e8f0', fontSize: '0.9rem' }}
                                                value={form.carrera_opcion2_id}
                                                onChange={e => set('carrera_opcion2_id', e.target.value)}
                                            >
                                                <option value="">Seleccionar carrera...</option>
                                                {carreras.map(c => (
                                                    <option key={c.id} value={c.id}
                                                        disabled={String(c.id) === String(form.carrera_opcion1_id)}>
                                                        {c.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                            {errores.carrera_opcion2_id && <div className="invalid-feedback">{errores.carrera_opcion2_id}</div>}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.65rem 1rem', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                    <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: 1 }}>ℹ️</span>
                                    <p style={{ color: '#92400e', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                                        La opción 2 se asigna si los cupos de la opción 1 están agotados. Deben ser carreras diferentes.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-between">
                            <button
                                type="button"
                                style={{ background: 'transparent', border: '1.5px solid #cbd5e1', color: '#64748b', borderRadius: 8, padding: '0.6rem 1.25rem', cursor: 'pointer', fontWeight: 500 }}
                                onClick={onVolver}
                            >
                                ← Volver al Login
                            </button>
                            <button
                                type="submit"
                                style={{
                                    background: enviando ? '#94a3b8' : '#f59e0b',
                                    color: enviando ? '#fff' : '#1a3a6b',
                                    border: 'none', borderRadius: 8,
                                    padding: '0.6rem 1.5rem', fontWeight: 700,
                                    cursor: enviando ? 'not-allowed' : 'pointer',
                                    boxShadow: enviando ? 'none' : '0 4px 14px rgba(245,158,11,0.4)',
                                    fontSize: '0.95rem', flexGrow: 1,
                                }}
                                disabled={enviando}
                            >
                                {enviando
                                    ? <><span className="spinner-border spinner-border-sm me-2" />Procesando...</>
                                    : 'Continuar a Documentos →'
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Registro;
