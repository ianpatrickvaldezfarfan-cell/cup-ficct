import React, { useState, useEffect } from 'react';

/**
 * Paso 1 del flujo de registro publico de postulantes (CU registro).
 *
 * Flujo completo de 4 pasos: Datos -> Documentos -> Pago -> Credenciales
 * Este componente implementa el PASO 1: formulario de datos personales.
 *
 * Secciones del formulario:
 * - Datos Personales: CI, nombres, apellidos, fecha nac, genero, telefono, correo, ciudad
 * - Procedencia Academica: colegio de procedencia
 * - Opciones de Carrera: dos selects cargados desde GET /api/carreras
 *   (opcion 2 no puede ser igual a opcion 1)
 *
 * Al enviar, hace POST /api/registro/paso1 que verifica cupos y crea
 * postulante + postulacion(PENDIENTE_PAGO) en una transaccion atomica.
 * Si exito, navega al Paso 2 (subida de documentos) via onDocumentos(datos).
 *
 * @param {Function} onDocumentos Callback con { postulacion_id, nombres, apellidos, monto }
 * @param {Function} onVolver     Callback para regresar al Login
 */
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

    const campo = (label, key, type = 'text', req = false) => (
        <div className="mb-3">
            <label className="form-label fw-semibold small">
                {label}{req && <span className="text-danger ms-1">*</span>}
            </label>
            <input
                type={type}
                className={`form-control ${errores[key] ? 'is-invalid' : ''}`}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
            />
            {errores[key] && <div className="invalid-feedback">{errores[key]}</div>}
        </div>
    );

    return (
        <div className="min-vh-100 bg-light py-4">
            <div className="container" style={{ maxWidth: 760 }}>

                {/* Header */}
                <div className="text-center mb-4">
                    <h2 className="fw-bold text-primary mb-1">CUP - FICCT</h2>
                    <p className="text-muted mb-0">Formulario de Inscripción</p>
                    <div className="d-flex justify-content-center gap-2 mt-3">
                        {['Datos', 'Documentos', 'Pago', 'Credenciales'].map((s, i) => (
                            <span key={i} className={`badge rounded-pill px-3 py-2 ${i === 0 ? 'bg-primary' : 'bg-secondary bg-opacity-25 text-secondary'}`}>
                                {i + 1}. {s}
                            </span>
                        ))}
                    </div>
                </div>

                {errorGeneral && <div className="alert alert-danger">{errorGeneral}</div>}

                <form onSubmit={handleSubmit}>

                    {/* Datos Personales */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-primary text-white py-2">
                            <h6 className="mb-0 fw-bold">Datos Personales</h6>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-4">{campo('Cédula de Identidad (CI)', 'ci', 'text', true)}</div>
                                <div className="col-md-4">{campo('Nombres', 'nombres', 'text', true)}</div>
                                <div className="col-md-4">{campo('Apellidos', 'apellidos', 'text', true)}</div>
                            </div>
                            <div className="row">
                                <div className="col-md-4">{campo('Fecha de Nacimiento', 'fecha_nac', 'date', true)}</div>
                                <div className="col-md-4">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold small">
                                            Género <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className={`form-select ${errores.genero ? 'is-invalid' : ''}`}
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
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-primary text-white py-2">
                            <h6 className="mb-0 fw-bold">Procedencia Académica</h6>
                        </div>
                        <div className="card-body">
                            {campo('Colegio de Procedencia', 'colegio_procedencia')}
                        </div>
                    </div>

                    {/* Opciones de Carrera */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-primary text-white py-2">
                            <h6 className="mb-0 fw-bold">Opciones de Carrera</h6>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold small">
                                            Carrera Opción 1 <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className={`form-select ${errores.carrera_opcion1_id ? 'is-invalid' : ''}`}
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
                                        <label className="form-label fw-semibold small">
                                            Carrera Opción 2 <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className={`form-select ${errores.carrera_opcion2_id ? 'is-invalid' : ''}`}
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
                            <p className="text-muted small mb-0">
                                Las carreras disponibles son para la gestión {new Date().getFullYear()}.
                                La opción 2 debe ser diferente a la opción 1.
                            </p>
                        </div>
                    </div>

                    {/* Acciones */}
                    <div className="d-flex gap-3 justify-content-between mb-5">
                        <button type="button" className="btn btn-outline-secondary" onClick={onVolver}>
                            ← Volver al Login
                        </button>
                        <button type="submit" className="btn btn-primary px-4" disabled={enviando}>
                            {enviando
                                ? <><span className="spinner-border spinner-border-sm me-2" />Procesando...</>
                                : 'Continuar al Pago →'
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Registro;
