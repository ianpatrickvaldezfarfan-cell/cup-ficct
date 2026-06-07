import React, { useState, useEffect } from 'react';

function Dashboard({ user, onLogout, onModulo }) {
    const [stats, setStats] = useState({
        total_inscritos: '-',
        total_aprobados: '-',
        total_reprobados: '-',
        total_grupos: '-',
    });

    useEffect(() => {
        fetch('/api/dashboard/estadisticas')
            .then(r => r.json())
            .then(data => setStats(data))
            .catch(() => {});
    }, []);

    const hoy = new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const inicial = (user.username || 'U').charAt(0).toUpperCase();

    const modulos = [
        { key: 'postulantes',  icon: '👥', label: 'Postulantes',    desc: 'Registrar y gestionar postulantes',              color: '#2563eb', bg: '#eff6ff' },
        { key: 'postulaciones',icon: '📋', label: 'Postulaciones',  desc: 'Gestionar postulaciones y estados de admisión',  color: '#4f46e5', bg: '#eef2ff' },
        { key: 'examenes',     icon: '📝', label: 'Exámenes',       desc: 'Registrar notas y calcular promedios',           color: '#059669', bg: '#ecfdf5' },
        { key: 'grupos',       icon: '🏫', label: 'Grupos',         desc: 'Asignación automática de grupos',                color: '#d97706', bg: '#fffbeb' },
        { key: 'docentes',     icon: '👨‍🏫', label: 'Docentes',       desc: 'Gestionar docentes y sus asignaciones',         color: '#0891b2', bg: '#ecfeff' },
        { key: 'usuarios',     icon: '👤', label: 'Usuarios y Roles',desc: 'Gestionar cuentas y permisos del sistema',      color: '#7c3aed', bg: '#f5f3ff' },
        { key: 'bitacora',     icon: '🗂️', label: 'Bitácora',       desc: 'Historial de auditoría del sistema',            color: '#475569', bg: '#f1f5f9' },
    ];

    return (
        <>
            <style>{`
                .dash-navbar {
                    background: linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%);
                    padding: 0 1.5rem;
                    height: 64px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 2px 12px rgba(26,58,107,0.35);
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
                .dash-avatar {
                    width: 38px; height: 38px; border-radius: 50%;
                    background: #f59e0b;
                    color: #1a3a6b;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; font-size: 1rem;
                    flex-shrink: 0;
                }
                .dash-logout-btn {
                    background: transparent;
                    border: 1.5px solid rgba(255,255,255,0.45);
                    color: #fff;
                    border-radius: 7px;
                    padding: 0.35rem 0.9rem;
                    cursor: pointer;
                    font-size: 0.82rem;
                    font-weight: 500;
                    transition: background 0.2s, border-color 0.2s;
                }
                .dash-logout-btn:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.7); }
                .dash-hero {
                    background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 50%, #f8fafc 100%);
                    padding: 2rem 2rem 1.5rem;
                    border-bottom: 1px solid #e2e8f0;
                }
                .dash-stat-card {
                    border-radius: 14px;
                    padding: 1.4rem 1.5rem;
                    color: #fff;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 4px 18px rgba(0,0,0,0.12);
                }
                .dash-stat-card .big-icon {
                    position: absolute;
                    right: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 2.8rem;
                    opacity: 0.25;
                }
                .dash-mod-card {
                    background: #fff;
                    border-radius: 14px;
                    padding: 1.5rem;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
                    border: 1px solid #e8edf5;
                    transition: transform 0.2s, box-shadow 0.2s;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    border-left: 4px solid transparent;
                }
                .dash-mod-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 28px rgba(0,0,0,0.12);
                }
                .dash-mod-icon {
                    width: 52px; height: 52px;
                    border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.6rem;
                    margin-bottom: 0.75rem;
                }
                .dash-mod-btn {
                    margin-top: auto;
                    border: none;
                    border-radius: 7px;
                    padding: 0.4rem 1rem;
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    color: #fff;
                    transition: opacity 0.15s;
                }
                .dash-mod-btn:hover { opacity: 0.85; }
                .dash-footer {
                    background: #1a3a6b;
                    color: rgba(255,255,255,0.7);
                    text-align: center;
                    padding: 0.85rem;
                    font-size: 0.78rem;
                    margin-top: 3rem;
                }
            `}</style>

            <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                {/* Navbar */}
                <nav className="dash-navbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.6rem' }}>🎓</span>
                        <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2 }}>
                                CUP - FICCT
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.68rem', letterSpacing: '0.3px' }}>
                                Sistema de Admisión Universitaria
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="dash-avatar">{inicial}</div>
                        <div style={{ lineHeight: 1.2 }}>
                            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>{user.username}</div>
                            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.72rem' }}>{user.rol}</div>
                        </div>
                        <button className="dash-logout-btn" onClick={onLogout}>
                            🚪 Cerrar Sesión
                        </button>
                    </div>
                </nav>

                {/* Hero */}
                <div className="dash-hero">
                    <div>
                        <h3 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '0.25rem', fontSize: '1.4rem' }}>
                            Bienvenido, {user.username} 👋
                        </h3>
                        <p style={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '0.88rem', textTransform: 'capitalize' }}>
                            {hoy}
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>
                            Panel de Control — Gestión CUP 2026
                        </p>
                    </div>
                </div>

                <div className="container-fluid" style={{ padding: '1.75rem 2rem' }}>
                    {/* Stats */}
                    <div className="row g-3 mb-4">
                        {[
                            { label: 'Total Inscritos',    val: stats.total_inscritos,    icon: '👥', grad: 'linear-gradient(135deg,#1a3a6b,#2563eb)' },
                            { label: 'Aprobados',          val: stats.total_aprobados,    icon: '✅', grad: 'linear-gradient(135deg,#059669,#10b981)' },
                            { label: 'Reprobados',         val: stats.total_reprobados,   icon: '❌', grad: 'linear-gradient(135deg,#dc2626,#ef4444)' },
                            { label: 'Grupos Habilitados', val: stats.total_grupos,       icon: '🏫', grad: 'linear-gradient(135deg,#d97706,#f59e0b)' },
                        ].map(({ label, val, icon, grad }) => (
                            <div className="col-md-3 col-sm-6" key={label}>
                                <div className="dash-stat-card" style={{ background: grad }}>
                                    <span className="big-icon">{icon}</span>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.88 }}>{label}</div>
                                    <div style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.1, marginTop: '0.3rem' }}>
                                        {val}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Module cards */}
                    <div style={{ marginBottom: '1rem' }}>
                        <h5 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '1.25rem' }}>
                            Módulos del Sistema
                        </h5>
                    </div>
                    <div className="row g-3">
                        {modulos.map(({ key, icon, label, desc, color, bg }) => (
                            <div className="col-md-4 col-sm-6" key={key}>
                                <div
                                    className="dash-mod-card"
                                    style={{ borderLeftColor: color }}
                                    onClick={() => onModulo(key)}
                                >
                                    <div className="dash-mod-icon" style={{ background: bg }}>
                                        {icon}
                                    </div>
                                    <h6 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.3rem' }}>{label}</h6>
                                    <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                                        {desc}
                                    </p>
                                    <button
                                        className="dash-mod-btn"
                                        style={{ background: color }}
                                        onClick={e => { e.stopPropagation(); onModulo(key); }}
                                    >
                                        Acceder →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <footer className="dash-footer">
                    FICCT © 2026 | Universidad Autónoma Gabriel René Moreno
                </footer>
            </div>
        </>
    );
}

export default Dashboard;
