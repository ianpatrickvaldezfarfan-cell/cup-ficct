import React, { useState, useEffect } from 'react';
import ModalCambiarPassword from './ModalCambiarPassword';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
const DIAS_LABEL  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function normDia(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tieneClase(dia, grupos) {
    const dn = normDia(dia);
    return (grupos || []).some(g => g.dias && normDia(g.dias).includes(dn));
}

function getGruposDelDia(dia, grupos) {
    const dn = normDia(dia);
    return (grupos || []).filter(g => g.dias && normDia(g.dias).includes(dn));
}

function getTurnoKey(horarioIni) {
    if (!horarioIni) return 'manana';
    const h = parseInt(horarioIni.split(':')[0]);
    if (h < 13) return 'manana';
    if (h < 18) return 'tarde';
    return 'noche';
}

const TURNO_INFO = {
    manana: { icono: '🌅', label: 'Mañana', bgColor: '#FFF9C4', textColor: '#F57F17', badgeColor: '#f59e0b', badgeText: '#1a3a6b' },
    tarde:  { icono: '🌇', label: 'Tarde',  bgColor: '#FFE0B2', textColor: '#E65100', badgeColor: '#f97316', badgeText: '#fff'    },
    noche:  { icono: '🌙', label: 'Noche',  bgColor: '#E8EAF6', textColor: '#1a3a6b', badgeColor: '#3949ab', badgeText: '#fff'    },
};

function getMateriaIcono(materia) {
    const m = (materia || '').toLowerCase();
    if (m.includes('comput') || m.includes('inform') || m.includes('sist')) return '🖥️';
    if (m.includes('matem') || m.includes('calculo') || m.includes('alg'))  return '📐';
    if (m.includes('ingles') || m.includes('ingl') || m.includes('idioma')) return '🌍';
    if (m.includes('fisic') || m.includes('quim') || m.includes('cienc'))   return '🔬';
    return '📚';
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Spinner() {
    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner-border" style={{ color: '#1a3a6b', width: 48, height: 48 }} role="status" />
                <p style={{ marginTop: 16, color: '#64748b', fontSize: 15 }}>Cargando panel docente...</p>
            </div>
        </div>
    );
}

function Volver({ onVolver, titulo }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={onVolver} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#64748b', fontSize: 13 }}>
                ← Volver al panel
            </button>
            <h5 style={{ margin: 0, color: '#1a3a6b', fontWeight: 700, fontSize: 18 }}>{titulo}</h5>
        </div>
    );
}

function BotonesExportar({ onCSV, onPDF }) {
    return (
        <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCSV} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                ⬇ CSV
            </button>
            <button onClick={onPDF} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                ⬇ PDF
            </button>
        </div>
    );
}

// ─── Sección Mis Datos ────────────────────────────────────────────────────────

function SeccionMisDatos({ userId, user, onVolver }) {
    const [datos, setDatos]   = useState(null);
    const [form, setForm]     = useState({});
    const [msg, setMsg]       = useState(null);
    const [saving, setSaving] = useState(false);
    const [modalPwd, setModalPwd] = useState(false);

    useEffect(() => {
        fetch('/api/docente/mis-datos', { headers: { 'Accept': 'application/json', 'X-User-Id': userId } })
            .then(r => r.json())
            .then(d => { setDatos(d); setForm(d); })
            .catch(() => {});
    }, []);

    async function guardar(e) {
        e.preventDefault();
        setSaving(true); setMsg(null);
        try {
            const res = await fetch('/api/docente/mis-datos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-User-Id': userId },
                body: JSON.stringify({ nombres: form.nombres, apellidos: form.apellidos, correo: form.correo }),
            });
            const data = await res.json();
            setMsg({ ok: res.ok, texto: data.mensaje || data.message || (res.ok ? 'Guardado' : 'Error') });
            if (res.ok) setDatos({ ...datos, ...form });
        } catch {
            setMsg({ ok: false, texto: 'Error de conexión' });
        } finally {
            setSaving(false);
        }
    }

    const exportarMisDatosCSV = () => {
        if (!datos) return;
        try {
            const headers = ['CI', 'Nombres', 'Apellidos', 'Correo', 'Profesion', 'Maestria', 'Diplomado'];
            const fila = [
                datos.username || '',
                datos.nombres || '',
                datos.apellidos || '',
                datos.correo || '',
                datos.profesion || '',
                datos.tiene_maestria ? 'Si' : 'No',
                datos.tiene_diplomado ? 'Si' : 'No',
            ];
            const csv = '﻿' + headers.join(',') + '\n' +
                fila.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = 'mis_datos_docente.csv'; link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generando CSV:', error);
            alert('Error al generar el CSV. Intenta de nuevo.');
        }
    };

    const exportarMisDatosPDF = () => {
        if (!datos) return;
        try {
            const doc = new jsPDF();
            doc.setFontSize(16); doc.setTextColor(26, 58, 107);
            doc.text('CUP-FICCT - Mis Datos Personales', 14, 15);
            doc.setFontSize(10); doc.setTextColor(100, 116, 139);
            doc.text('Generado: ' + new Date().toLocaleDateString('es-BO'), 14, 22);
            autoTable(doc, {
                startY: 30,
                head: [['Campo', 'Valor']],
                body: [
                    ['CI',         datos.username || ''],
                    ['Nombres',    datos.nombres || ''],
                    ['Apellidos',  datos.apellidos || ''],
                    ['Correo',     datos.correo || ''],
                    ['Profesion',  datos.profesion || ''],
                    ['Maestria',   datos.tiene_maestria ? 'Si' : 'No'],
                    ['Diplomado',  datos.tiene_diplomado ? 'Si' : 'No'],
                ],
                headStyles: { fillColor: [26, 58, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 9 },
            });
            doc.save('mis_datos_docente.pdf');
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el PDF. Intenta de nuevo.');
        }
    };

    const labelStyle = { fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 };
    const inputBase  = (editable) => ({ borderRadius: 8, fontSize: 14, borderColor: editable ? '#e2e8f0' : '#f1f5f9', background: editable ? '#fff' : '#f8fafc', height: 40 });

    const Campo = ({ label, campo, editable = true, tipo = 'text' }) => (
        <div className="col-md-6 mb-3">
            <label style={labelStyle}>{label}</label>
            <input
                type={tipo}
                className="form-control"
                value={form[campo] ?? ''}
                onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
                disabled={!editable}
                style={inputBase(editable)}
            />
        </div>
    );

    if (!datos) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
            <div className="spinner-border" style={{ color: '#1a3a6b' }} role="status" />
        </div>
    );

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 32px' }}>
            <Volver onVolver={onVolver} titulo="Mis Datos Personales" />
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '28px 32px', maxWidth: 760 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
                    <button onClick={exportarMisDatosCSV} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>⬇ CSV</button>
                    <button onClick={exportarMisDatosPDF} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>⬇ PDF</button>
                </div>
                <form onSubmit={guardar}>
                    <div className="row">
                        <Campo label="CI (no modificable)"   campo="username"         editable={false} />
                        <Campo label="Profesión (no modificable)" campo="profesion"  editable={false} />
                        <Campo label="Nombres *"             campo="nombres" />
                        <Campo label="Apellidos *"           campo="apellidos" />
                        <Campo label="Correo *"              campo="correo"            tipo="email" />
                        <div className="col-md-6 mb-3">
                            <label style={labelStyle}>Maestría</label>
                            <input className="form-control" disabled value={datos.tiene_maestria ? 'Sí' : 'No'} style={inputBase(false)} />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label style={labelStyle}>Diplomado</label>
                            <input className="form-control" disabled value={datos.tiene_diplomado ? 'Sí' : 'No'} style={inputBase(false)} />
                        </div>
                    </div>
                    {msg && (
                        <div style={{ background: msg.ok ? '#d1fae5' : '#fee2e2', color: msg.ok ? '#065f46' : '#991b1b', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 13 }}>
                            {msg.texto}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button type="submit" disabled={saving} style={{ background: '#f59e0b', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, color: '#1a3a6b', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                            {saving ? 'Guardando...' : '💾 Guardar cambios'}
                        </button>
                        <button type="button" onClick={() => setModalPwd(true)} style={{ background: 'transparent', border: '2px solid #2563eb', borderRadius: 8, padding: '9px 20px', fontWeight: 700, color: '#2563eb', cursor: 'pointer', fontSize: 14 }}>
                            🔒 Cambiar Contraseña
                        </button>
                    </div>
                </form>
            </div>
            {modalPwd && <ModalCambiarPassword userId={userId} onClose={() => setModalPwd(false)} />}
        </div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function PanelDocente({ user, onLogout }) {
    const [stats, setStats]               = useState({ total_grupos: 0, total_postulantes: 0, notas_registradas: 0 });
    const [grupos, setGrupos]             = useState([]);
    const [cargando, setCargando]         = useState(true);
    const [seccion, setSeccion]           = useState(null);
    const [grupoAbierto, setGrupoAbierto] = useState(null);
    const [modal, setModal]               = useState(null);
    const [formNota, setFormNota]         = useState({ nota1: '', nota2: '', nota3: '' });
    const [guardando, setGuardando]       = useState(false);
    const [mensaje, setMensaje]           = useState(null);
    const [hoverLogout, setHoverLogout]   = useState(false);
    const [modalPwd, setModalPwd]         = useState(false);

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
        setFormNota({ nota1: postulante.nota1 ?? '', nota2: postulante.nota2 ?? '', nota3: postulante.nota3 ?? '' });
        setModal({ postulante, grupo });
        setMensaje(null);
    }

    async function guardarNota() {
        setGuardando(true); setMensaje(null);
        const { postulante, grupo } = modal;
        const body = { nota1: parseFloat(formNota.nota1), nota2: parseFloat(formNota.nota2), nota3: parseFloat(formNota.nota3) };
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

    // Export
    const exportarHorarioCSV = () => {
        if (!grupos || grupos.length === 0) return;
        try {
            const headers = ['Grupo', 'Materia', 'Aula', 'Horario', 'Dias', 'Turno', 'Estudiantes'];
            const filas = grupos.map(g => [
                g.grupo_nombre || '',
                g.materia || '',
                g.aula || '',
                (g.horario_ini || '') + ' - ' + (g.horario_fin || ''),
                g.dias || '',
                g.turno || '',
                g.total_estudiantes ?? '',
            ]);
            const csv = '﻿' + headers.join(',') + '\n' +
                filas.map(f => f.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = 'mi_horario_docente.csv'; link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generando CSV:', error);
            alert('Error al generar el CSV. Intenta de nuevo.');
        }
    };

    const exportarHorarioPDF = () => {
        if (!grupos || grupos.length === 0) return;
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            doc.setFontSize(16); doc.setTextColor(26, 58, 107);
            doc.text('CUP-FICCT - Mi Horario de Clases', 14, 15);
            doc.setFontSize(10); doc.setTextColor(100, 116, 139);
            doc.text('Generado: ' + new Date().toLocaleDateString('es-BO'), 14, 22);
            doc.text('Docente: ' + user.username, 14, 28);
            autoTable(doc, {
                startY: 35,
                head: [['Grupo', 'Materia', 'Aula', 'Horario', 'Dias', 'Turno', 'Estudiantes']],
                body: grupos.map(g => [
                    g.grupo_nombre || '',
                    g.materia || '',
                    g.aula || '',
                    (g.horario_ini || '') + ' - ' + (g.horario_fin || ''),
                    g.dias || '',
                    g.turno || '',
                    String(g.total_estudiantes ?? '0'),
                ]),
                headStyles: { fillColor: [26, 58, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 8 },
            });
            doc.save('mi_horario_docente.pdf');
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el PDF. Intenta de nuevo.');
        }
    };

    const totalMaterias = new Set(grupos.map(g => g.materia)).size;

    const thStyle = {
        backgroundColor: '#1a3a6b', color: '#ffffff',
        fontWeight: 600, fontSize: 13, padding: '10px 12px', whiteSpace: 'nowrap',
    };

    if (cargando) return <Spinner />;

    if (seccion === 'datos') return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <NavBar user={user} onLogout={onLogout} onVerDatos={() => setSeccion('datos')}
                hoverLogout={hoverLogout} setHoverLogout={setHoverLogout}
                onModalPwd={() => setModalPwd(true)} modoSeccion titulo="Mis Datos" />
            <SeccionMisDatos userId={user.id} user={user} onVolver={() => setSeccion(null)} />
            {modalPwd && <ModalCambiarPassword userId={user.id} onClose={() => setModalPwd(false)} />}
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

            <NavBar user={user} onLogout={onLogout} onVerDatos={() => setSeccion('datos')}
                hoverLogout={hoverLogout} setHoverLogout={setHoverLogout}
                onModalPwd={() => setModalPwd(true)} modoSeccion={false} titulo={null} />

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
                        <div className="col-6 col-md-auto">
                            <StatHero valor={stats.total_grupos}      etiqueta="Grupos asignados"  color="#f59e0b" />
                        </div>
                        <div className="col-6 col-md-auto">
                            <StatHero valor={stats.total_postulantes} etiqueta="Total postulantes"  color="#34d399" />
                        </div>
                        <div className="col-6 col-md-auto">
                            <StatHero valor={stats.notas_registradas} etiqueta="Notas registradas"  color="#a78bfa" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido principal */}
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

                {/* ── Tarjetas de resumen ── */}
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total Grupos Asignados', val: stats.total_grupos,      icono: '🏫', grad: 'linear-gradient(135deg,#1a3a6b,#2563eb)' },
                        { label: 'Total Materias',         val: totalMaterias,            icono: '📚', grad: 'linear-gradient(135deg,#15803d,#16a34a)' },
                        { label: 'Total Postulantes',      val: stats.total_postulantes,  icono: '👥', grad: 'linear-gradient(135deg,#d97706,#f59e0b)' },
                    ].map(({ label, val, icono, grad }) => (
                        <div className="col-md-4 col-6" key={label}>
                            <div style={{ background: grad, borderRadius: 14, padding: '18px 22px', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
                                <div style={{ fontSize: 26, marginBottom: 6 }}>{icono}</div>
                                <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{val}</div>
                                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Mi Horario Semanal ── */}
                <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '24px 28px', marginBottom: 28 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
                        <div>
                            <h5 style={{ color: '#1a3a6b', fontWeight: 700, margin: 0, fontSize: 17 }}>📅 Mi Horario Semanal</h5>
                            <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>Días y horarios en que impartes clases</p>
                        </div>
                        <BotonesExportar onCSV={exportarHorarioCSV} onPDF={exportarHorarioPDF} />
                    </div>

                    {grupos.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 14 }}>
                            Sin grupos asignados — el horario se mostrará una vez que se realice la asignación.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', marginTop: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', gap: 8, minWidth: 770 }}>
                                {DIAS_SEMANA.map((dia, i) => {
                                    const gruposHoy = getGruposDelDia(dia, grupos);
                                    const activo    = gruposHoy.length > 0;
                                    const turnoKey  = activo ? getTurnoKey(gruposHoy[0].horario_ini) : 'libre';
                                    const info      = TURNO_INFO[turnoKey] ?? { bgColor: '#F5F5F5', textColor: '#9E9E9E', icono: '😴', label: 'Libre' };
                                    const cellBg    = activo ? info.bgColor  : '#F5F5F5';
                                    const cellColor = activo ? info.textColor : '#9E9E9E';

                                    return (
                                        <div key={dia} style={{ background: cellBg, borderRadius: 8, padding: '12px 8px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: cellColor, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                {DIAS_LABEL[i]}
                                            </div>
                                            <div style={{ fontSize: 28 }}>{activo ? info.icono : '😴'}</div>
                                            <div style={{ fontSize: 11, fontWeight: 600, color: cellColor, lineHeight: 1.4 }}>
                                                {activo ? (
                                                    <>
                                                        <div>{gruposHoy[0].horario_ini} - {gruposHoy[0].horario_fin}</div>
                                                        {gruposHoy.length > 1 && (
                                                            <div style={{ fontSize: 10, marginTop: 2 }}>{gruposHoy.length} grupos</div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span>Libre</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: cellColor, background: activo ? 'rgba(0,0,0,0.07)' : 'transparent', borderRadius: 4, padding: '1px 6px', minHeight: 16 }}>
                                                {activo ? 'Clases' : ''}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Mis Grupos y Materias (cards compactos) ── */}
                {grupos.length > 0 && (
                    <div style={{ marginBottom: 28 }}>
                        <h5 style={{ color: '#1a3a6b', fontWeight: 700, marginBottom: 16, fontSize: 17 }}>📚 Mis Grupos y Materias</h5>
                        <div className="row g-3">
                            {grupos.map((g, i) => {
                                const turnoKey = getTurnoKey(g.horario_ini);
                                const turno    = TURNO_INFO[turnoKey];
                                return (
                                    <div className="col-md-6 col-lg-4" key={i}>
                                        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `3px solid ${turno.badgeColor}`, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                                                <span style={{ fontSize: 28 }}>{getMateriaIcono(g.materia)}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 15 }}>{g.grupo_nombre}</div>
                                                    <div style={{ background: '#eff6ff', color: '#2563eb', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, display: 'inline-block', marginTop: 2 }}>
                                                        {g.materia}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, flex: 1 }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 12, color: '#64748b' }}>
                                                    {g.aula && (
                                                        <div><span style={{ fontWeight: 600 }}>🏫 Aula:</span> {g.aula}</div>
                                                    )}
                                                    {g.horario_ini && (
                                                        <div><span style={{ fontWeight: 600 }}>⏰</span> {g.horario_ini}–{g.horario_fin}</div>
                                                    )}
                                                    {g.dias && (
                                                        <div style={{ gridColumn: '1/-1' }}><span style={{ fontWeight: 600 }}>📅 Días:</span> {g.dias}</div>
                                                    )}
                                                    <div>
                                                        <span style={{ background: turno.bgColor, color: turno.textColor, borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                                                            {turno.icono} {turno.label}
                                                        </span>
                                                    </div>
                                                    <div style={{ color: '#1e293b', fontWeight: 600 }}>
                                                        👥 {g.total_estudiantes} estudiantes
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Mis Grupos (con edición de notas) ── */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h5 style={{ color: '#1a3a6b', fontWeight: 700, margin: 0, fontSize: 17 }}>Registrar / Editar Notas</h5>
                        <button onClick={cargarDatos} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', color: '#475569', fontSize: 13, cursor: 'pointer' }}>
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
                                ✕
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
                                    type="number" min={0} max={100} step={0.1}
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
                            <button onClick={() => setModal(null)} style={{ border: '1.5px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '9px 22px', cursor: 'pointer', color: '#64748b', fontSize: 14 }}>
                                Cancelar
                            </button>
                            <button onClick={guardarNota} disabled={guardando}
                                style={{ background: guardando ? '#fcd34d' : '#f59e0b', border: 'none', borderRadius: 8, padding: '9px 22px', cursor: guardando ? 'not-allowed' : 'pointer', color: '#1a3a6b', fontWeight: 700, fontSize: 14 }}>
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

// ─── Navbar ───────────────────────────────────────────────────────────────────

function NavBar({ user, onLogout, onVerDatos, hoverLogout, setHoverLogout, onModalPwd, modoSeccion, titulo }) {
    return (
        <nav style={{ background: '#1a3a6b', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.2)', border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: 15 }}>F</span>
                </div>
                <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>CUP-FICCT</div>
                    <div style={{ color: '#93c5fd', fontSize: 11 }}>{modoSeccion ? titulo : 'Panel Docente'}</div>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="d-none d-sm-block" style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{user.username}</div>
                    <div style={{ color: '#93c5fd', fontSize: 11 }}>{user.correo}</div>
                </div>
                <button
                    onClick={onVerDatos}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                    title="Ver mis datos"
                >
                    <span className="d-none d-sm-inline">👤 Mis Datos</span>
                    <span className="d-sm-none">👤</span>
                </button>
                <button
                    onClick={onModalPwd}
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
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

    const exportarNotasGrupoCSV = (e) => {
        e.stopPropagation();
        if (!grupo.postulantes || grupo.postulantes.length === 0) return;
        try {
            const headers = ['CI', 'Nombres', 'Apellidos', 'Materia', 'Nota 1', 'Nota 2', 'Nota 3', 'Promedio', 'Estado'];
            const filas = grupo.postulantes.map(p => [
                p.ci || '',
                p.nombres || '',
                p.apellidos || '',
                grupo.materia || '',
                p.nota1 ?? 'Pendiente',
                p.nota2 ?? 'Pendiente',
                p.nota3 ?? 'Pendiente',
                p.nota_final ?? 'Pendiente',
                p.estado_materia || 'Pendiente',
            ]);
            const aprobados  = grupo.postulantes.filter(p => p.estado_materia === 'APROBADO').length;
            const reprobados = grupo.postulantes.filter(p => p.estado_materia === 'REPROBADO').length;
            filas.push(['', '', '', 'TOTAL APROBADOS:',  String(aprobados),  '', '', '', '']);
            filas.push(['', '', '', 'TOTAL REPROBADOS:', String(reprobados), '', '', '', '']);
            const csv = '﻿' + headers.join(',') + '\n' +
                filas.map(f => f.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const nombre = (grupo.grupo_nombre || 'grupo').replace(/\s+/g, '_');
            const materia = (grupo.materia || 'materia').replace(/\s+/g, '_');
            link.href = url; link.download = `notas_${nombre}_${materia}.csv`; link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generando CSV:', error);
            alert('Error al generar el CSV. Intenta de nuevo.');
        }
    };

    const exportarNotasGrupoPDF = (e) => {
        e.stopPropagation();
        if (!grupo.postulantes || grupo.postulantes.length === 0) return;
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            doc.setFontSize(14); doc.setTextColor(26, 58, 107);
            doc.text('CUP-FICCT - Notas por Grupo', 14, 15);
            doc.setFontSize(10); doc.setTextColor(100, 116, 139);
            doc.text('Grupo: '    + (grupo.grupo_nombre || ''), 14, 22);
            doc.text('Materia: '  + (grupo.materia || ''),      14, 28);
            doc.text('Aula: '     + (grupo.aula || ''),         100, 28);
            doc.text('Generado: ' + new Date().toLocaleDateString('es-BO'), 14, 34);
            const aprobados  = grupo.postulantes.filter(p => p.estado_materia === 'APROBADO').length;
            const reprobados = grupo.postulantes.filter(p => p.estado_materia === 'REPROBADO').length;
            doc.text('Total: ' + grupo.postulantes.length + '  |  Aprobados: ' + aprobados + '  |  Reprobados: ' + reprobados, 14, 40);
            autoTable(doc, {
                startY: 46,
                head: [['#', 'CI', 'Nombres', 'Apellidos', 'Nota 1', 'Nota 2', 'Nota 3', 'Promedio', 'Estado']],
                body: grupo.postulantes.map((p, i) => [
                    String(i + 1),
                    p.ci || '',
                    p.nombres || '',
                    p.apellidos || '',
                    p.nota1 ?? '—',
                    p.nota2 ?? '—',
                    p.nota3 ?? '—',
                    p.nota_final ?? '—',
                    p.estado_materia || 'Pendiente',
                ]),
                headStyles: { fillColor: [26, 58, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 8 },
                didParseCell: function(data) {
                    if (data.column.index === 8) {
                        if (data.cell.raw === 'APROBADO')  { data.cell.styles.textColor = [22, 163, 74];  data.cell.styles.fontStyle = 'bold'; }
                        if (data.cell.raw === 'REPROBADO') { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; }
                    }
                },
            });
            const nombre = (grupo.grupo_nombre || 'grupo').replace(/\s+/g, '_');
            const materia = (grupo.materia || 'materia').replace(/\s+/g, '_');
            doc.save(`notas_${nombre}_${materia}.pdf`);
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el PDF. Intenta de nuevo.');
        }
    };

    const btnMini = (bg, label, handler) => (
        <button
            onClick={handler}
            style={{ backgroundColor: bg, color: 'white', border: 'none', padding: '3px 9px', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
            {label}
        </button>
    );

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                    {/* Mini export buttons — siempre visibles en el header */}
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        {btnMini('#16a34a', '⬇ CSV', exportarNotasGrupoCSV)}
                        {btnMini('#dc2626', '⬇ PDF', exportarNotasGrupoPDF)}
                    </div>
                    <span style={{ color: '#94a3b8', fontSize: 14, fontWeight: 700 }}>{abierto ? '▲' : '▼'}</span>
                </div>
            </div>

            {abierto && (
                <div style={{ padding: '16px 22px 22px', overflowX: 'auto' }}>
                    {/* Botones de exportación en vista expandida */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        <button onClick={exportarNotasGrupoCSV} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                            ⬇ CSV Notas
                        </button>
                        <button onClick={exportarNotasGrupoPDF} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                            ⬇ PDF Notas
                        </button>
                    </div>
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
