import React, { useState, useEffect } from 'react';
import ModalCambiarPassword from './ModalCambiarPassword';

/**
 * CU12 - GESTIONAR NOTAS (Panel Docente)
 * FLUJO 1 - Docente registra notas:
 * Mensaje 1.5: registrarNotas(postulacion_id, materia_id, nota1, nota2, nota3)
 *   → handleGuardarNotas() en modal
 * Mensaje 1.6: procesarNotas()
 *   → POST /api/examenes o PUT /api/examenes/{id}
 * Mensaje 1.13: mostrarResultado()
 *   → actualiza tabla con nuevas notas y estado
 */
export default function PanelDocente({ user, onLogout }) {
    const [stats, setStats]         = useState({ total_grupos: 0, total_postulantes: 0, notas_registradas: 0 });
    const [grupos, setGrupos]       = useState([]);
    const [cargando, setCargando]   = useState(true);
    const [grupoAbierto, setGrupoAbierto] = useState(null);
    const [modal, setModal]         = useState(null);
    const [formNota, setFormNota]   = useState({ nota1: '', nota2: '', nota3: '' });
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje]     = useState(null);
    const [hoverLogout, setHoverLogout] = useState(false);
    const [modalPwd, setModalPwd]       = useState(false);

    useEffect(() => { cargarDatos(); }, []);

    async function cargarDatos() {
        setCargando(true);
        try {
            const headers = { 'Accept': 'application/json', 'X-User-Id': user.id };
            const [resStats, resGrupos] = await Promise.all([
                fetch('/api/docentes/mis-estadisticas', { headers }),
                fetch('/api/docentes/mis-grupos',       { headers }),
            ]);
            setStats(await resStats.json());
            setGrupos(await resGrupos.json());
        } catch (e) {
            console.error(e);
        } finally {
            setCargando(false);
        }
    }

    function abrirModal(postulante, grupo) {
        setFormNota({
            nota1: postulante.nota1 ?? '',
            nota2: postulante.nota2 ?? '',
            nota3: postulante.nota3 ?? '',
        });
        setModal({ postulante, grupo });
        setMensaje(null);
    }

    async function guardarNota() {
        setGuardando(true);
        setMensaje(null);
        const { postulante, grupo } = modal;
        const body = {
            nota1: parseFloat(formNota.nota1),
            nota2: parseFloat(formNota.nota2),
            nota3: parseFloat(formNota.nota3),
        };
        try {
            let res;
            if (postulante.nota_id) {
                res = await fetch(`/api/examenes/${postulante.nota_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-User-Id': user.id },
                    body: JSON.stringify(body),
                });
            } else {
                res = await fetch('/api/examenes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-User-Id': user.id },
                    body: JSON.stringify({ ...body, postulacion_id: postulante.postulacion_id, materia_id: grupo.materia_id }),
                });
            }
            if (res.ok) {
                setMensaje({ tipo: 'ok', texto: 'Notas guardadas correctamente.' });
                await cargarDatos();
                setTimeout(() => setModal(null), 1200);
            } else {
                const data = await res.json();
                setMensaje({ tipo: 'error', texto: data.message || 'Error al guardar.' });
            }
        } catch {
            setMensaje({ tipo: 'error', texto: 'Error de conexión.' });
        } finally {
            setGuardando(false);
        }
    }

    const thStyle = {
        backgroundColor: '#1a3a6b',
        color: '#ffffff',
        fontWeight: 600,
        fontSize: 13,
        padding: '10px 12px',
        whiteSpace: 'nowrap',
    };

    if (cargando) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner-border" style={{ color: '#1a3a6b', width: 48, height: 48 }} role="status" />
                    <p style={{ marginTop: 16, color: '#64748b', fontSize: 15 }}>Cargando panel docente...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

            {/* Navbar */}
            <nav style={{ background: '#1a3a6b', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.2)', border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: 15 }}>F</span>
                    </div>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>CUP-FICCT</div>
                        <div style={{ color: '#93c5fd', fontSize: 11 }}>Panel Docente</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="d-none d-sm-block" style={{ textAlign: 'right' }}>
                        <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{user.username}</div>
                        <div style={{ color: '#93c5fd', fontSize: 11 }}>{user.correo}</div>
                    </div>
                    <button
                        onClick={() => setModalPwd(true)}
                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                        title="Cambiar contraseña"
                    >
                        <span className="d-none d-sm-inline">🔒 Contraseña</span>
                        <span className="d-sm-none">🔒</span>
                    </button>
                    <button
                        onClick={onLogout}
                        onMouseEnter={() => setHoverLogout(true)}
                        onMouseLeave={() => setHoverLogout(false)}
                        style={{ background: hoverLogout ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'background 0.15s' }}
                    >
                        <span className="d-none d-sm-inline">Cerrar sesion</span>
                        <span className="d-sm-none">🚪</span>
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%)', padding: '36px 32px 44px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ marginBottom: 6 }}>
                        <span style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 20, padding: '3px 14px', fontSize: 12, color: '#fcd34d', fontWeight: 600 }}>
                            DOCENTE
                        </span>
                    </div>
                    <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 26, margin: '8px 0 4px' }}>
                        Bienvenido, {user.username}
                    </h2>
                    <p style={{ color: '#bfdbfe', fontSize: 14, margin: '0 0 28px' }}>
                        Gestion 2026 — Curso Preuniversitario FICCT
                    </p>
                    <div className="row g-3 mt-0">
                        <div className="col-6 col-md-auto"><StatHero valor={stats.total_grupos}      etiqueta="Grupos asignados"  color="#f59e0b" /></div>
                        <div className="col-6 col-md-auto"><StatHero valor={stats.total_postulantes} etiqueta="Total postulantes"  color="#34d399" /></div>
                        <div className="col-6 col-md-auto"><StatHero valor={stats.notas_registradas} etiqueta="Notas registradas"  color="#a78bfa" /></div>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h5 style={{ color: '#1a3a6b', fontWeight: 700, margin: 0, fontSize: 18 }}>Mis Grupos</h5>
                    <button
                        onClick={cargarDatos}
                        style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', color: '#475569', fontSize: 13, cursor: 'pointer' }}
                    >
                        Actualizar
                    </button>
                </div>

                {grupos.length === 0 ? (
                    <div style={{ background: '#fff', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: '#94a3b8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        No tienes grupos asignados en la gestion actual.
                    </div>
                ) : (
                    grupos.map((grupo, idx) => (
                        <GrupoCard
                            key={idx}
                            grupo={grupo}
                            abierto={grupoAbierto === idx}
                            onToggle={() => setGrupoAbierto(grupoAbierto === idx ? null : idx)}
                            onEditarNota={(postulante) => abrirModal(postulante, grupo)}
                            thStyle={thStyle}
                        />
                    ))
                )}
            </div>

            {/* Modal notas */}
            {modal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 12 }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflowY: 'auto', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h5 style={{ margin: 0, color: '#1a3a6b', fontWeight: 700, fontSize: 17 }}>
                                {modal.postulante.nota_id ? 'Editar Notas' : 'Registrar Notas'}
                            </h5>
                            <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>
                                x
                            </button>
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                                {modal.postulante.apellidos}, {modal.postulante.nombres}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>CI: {modal.postulante.ci}</div>
                            <div style={{ marginTop: 6, display: 'inline-block', background: '#eff6ff', color: '#2563eb', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                                {modal.grupo.materia}
                            </div>
                        </div>
                        {['nota1', 'nota2', 'nota3'].map((campo, i) => (
                            <div key={campo} style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>
                                    Nota {i + 1} <span style={{ color: '#94a3b8', fontWeight: 400 }}>(0 - 100)</span>
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.1}
                                    value={formNota[campo]}
                                    onChange={e => setFormNota(f => ({ ...f, [campo]: e.target.value }))}
                                    style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                        ))}
                        {mensaje && (
                            <div style={{ padding: '9px 14px', borderRadius: 8, marginBottom: 16, background: mensaje.tipo === 'ok' ? '#d1fae5' : '#fee2e2', color: mensaje.tipo === 'ok' ? '#065f46' : '#991b1b', fontSize: 13, fontWeight: 500 }}>
                                {mensaje.texto}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4, flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setModal(null)}
                                style={{ border: '1.5px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '9px 22px', cursor: 'pointer', color: '#64748b', fontSize: 14 }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={guardarNota}
                                disabled={guardando}
                                style={{ background: guardando ? '#fcd34d' : '#f59e0b', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: guardando ? 'not-allowed' : 'pointer', color: '#1a3a6b', fontWeight: 700, fontSize: 14 }}
                            >
                                {guardando ? 'Guardando...' : 'Guardar Notas'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalPwd && <ModalCambiarPassword userId={user.id} onClose={() => setModalPwd(false)} />}
        </div>
    );
}

function StatHero({ valor, etiqueta, color }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '18px 26px', backdropFilter: 'blur(4px)', minWidth: 150 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1.1 }}>{valor}</div>
            <div style={{ fontSize: 13, color: '#bfdbfe', marginTop: 4 }}>{etiqueta}</div>
        </div>
    );
}

function GrupoCard({ grupo, abierto, onToggle, onEditarNota, thStyle }) {
    const [hoverHeader, setHoverHeader] = useState(false);

    return (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', marginBottom: 16, overflow: 'hidden' }}>
            <div
                onClick={onToggle}
                onMouseEnter={() => setHoverHeader(true)}
                onMouseLeave={() => setHoverHeader(false)}
                style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderLeft: '4px solid #1a3a6b', background: hoverHeader ? '#f8fafc' : '#fff', transition: 'background 0.1s', flexWrap: 'wrap', gap: 8 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 16 }}>{grupo.grupo_nombre}</span>
                    <span style={{ background: '#eff6ff', color: '#2563eb', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                        {grupo.materia}
                    </span>
                    {grupo.turno && (
                        <span style={{ background: '#fef9c3', color: '#92400e', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 500 }}>
                            {grupo.turno}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {(grupo.aula || grupo.horario_ini) && (
                        <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
                            {grupo.aula && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                                    <span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>AULA</span>
                                    <strong>{grupo.aula}</strong>
                                </div>
                            )}
                            {grupo.horario_ini && (
                                <div>{grupo.horario_ini}–{grupo.horario_fin}{grupo.dias ? ' · ' + grupo.dias : ''}</div>
                            )}
                        </div>
                    )}
                    <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        {grupo.postulantes.length} postulantes
                    </div>
                    <span style={{ color: '#94a3b8', fontSize: 14, fontWeight: 700 }}>{abierto ? '▲' : '▼'}</span>
                </div>
            </div>

            {abierto && (
                <div style={{ padding: '0 22px 22px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr>
                                {['CI', 'Apellidos', 'Nombres', 'Nota 1', 'Nota 2', 'Nota 3', 'Promedio', 'Estado', 'Accion'].map(h => (
                                    <th key={h} style={thStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {grupo.postulantes.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: 13 }}>
                                        Sin postulantes asignados a este grupo.
                                    </td>
                                </tr>
                            ) : (
                                grupo.postulantes.map((p, i) => (
                                    <PostulanteRow key={i} p={p} i={i} onEditarNota={onEditarNota} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function PostulanteRow({ p, i, onEditarNota }) {
    const [hover, setHover] = useState(false);
    const tieneNota = p.nota_id !== null && p.nota_id !== undefined;

    return (
        <tr
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{ background: hover ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#f8fafc' }}
        >
            <td style={{ padding: '9px 12px', color: '#374151' }}>{p.ci}</td>
            <td style={{ padding: '9px 12px', color: '#374151' }}>{p.apellidos}</td>
            <td style={{ padding: '9px 12px', color: '#374151' }}>{p.nombres}</td>
            <td style={{ padding: '9px 12px', textAlign: 'center', color: tieneNota ? '#374151' : '#cbd5e1' }}>
                {tieneNota ? p.nota1 : '—'}
            </td>
            <td style={{ padding: '9px 12px', textAlign: 'center', color: tieneNota ? '#374151' : '#cbd5e1' }}>
                {tieneNota ? p.nota2 : '—'}
            </td>
            <td style={{ padding: '9px 12px', textAlign: 'center', color: tieneNota ? '#374151' : '#cbd5e1' }}>
                {tieneNota ? p.nota3 : '—'}
            </td>
            <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                {tieneNota ? (
                    <span style={{ fontWeight: 700, color: parseFloat(p.nota_final) >= 60 ? '#059669' : '#dc2626' }}>
                        {parseFloat(p.nota_final).toFixed(1)}
                    </span>
                ) : (
                    <span style={{ color: '#cbd5e1' }}>—</span>
                )}
            </td>
            <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                {tieneNota ? (
                    <span style={{
                        background: p.estado_materia === 'APROBADO' ? '#d1fae5' : p.estado_materia === 'REPROBADO' ? '#fee2e2' : '#fef9c3',
                        color:      p.estado_materia === 'APROBADO' ? '#065f46' : p.estado_materia === 'REPROBADO' ? '#991b1b' : '#92400e',
                        borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700,
                    }}>
                        {p.estado_materia}
                    </span>
                ) : (
                    <span style={{ color: '#cbd5e1', fontSize: 11 }}>Sin notas</span>
                )}
            </td>
            <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                <button
                    onClick={() => onEditarNota(p)}
                    style={{
                        background: tieneNota ? '#eff6ff' : '#f59e0b',
                        color:      tieneNota ? '#2563eb' : '#1a3a6b',
                        border:     tieneNota ? '1px solid #bfdbfe' : 'none',
                        borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    {tieneNota ? 'Editar' : 'Registrar'}
                </button>
            </td>
        </tr>
    );
}
