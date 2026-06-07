import React, { useState, useEffect, useRef } from 'react';

/* ─── Dropdown hook ─── */
function useDropdown() {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        function handler(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    return { open, toggle: () => setOpen(v => !v), close: () => setOpen(false), ref };
}

/* ─── Section title component ─── */
function SectionTitle({ children, light = false }) {
    return (
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontWeight: 800, fontSize: '2rem', color: light ? '#fff' : '#1a3a6b', marginBottom: '0.75rem' }}>
                {children}
            </h2>
            <div style={{ width: 60, height: 4, background: '#f59e0b', borderRadius: 99, margin: '0 auto' }} />
        </div>
    );
}

export default function LandingPage({ onLogin, onRegistro }) {
    const carrerasDD = useDropdown();
    const materiasDD = useDropdown();
    const [menuMobile, setMenuMobile] = useState(false);

    useEffect(() => {
        const onResize = () => { if (window.innerWidth >= 768) setMenuMobile(false); };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const scrollToCarreras = () => {
        const el = document.getElementById('carreras');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const carreras = [
        { icon: '🖥️', nombre: 'Ingeniería en Sistemas',               cupos: 150, color: '#2563eb' },
        { icon: '💻', nombre: 'Ingeniería Informática',               cupos: 150, color: '#4f46e5' },
        { icon: '📡', nombre: 'Ing. en Redes y Telecomunicaciones',   cupos: 100, color: '#0891b2' },
        { icon: '🤖', nombre: 'Ingeniería en Robótica',               cupos: 100, color: '#059669' },
    ];

    const materias = [
        { icon: '🖥️', nombre: 'Computación' },
        { icon: '📐', nombre: 'Matemáticas' },
        { icon: '🔬', nombre: 'Física'       },
        { icon: '🌍', nombre: 'Inglés'        },
    ];

    const pasos = [
        { num: 1, icon: '📋', titulo: 'Registro',    desc: 'Completa tus datos personales' },
        { num: 2, icon: '📄', titulo: 'Documentos',  desc: 'Sube tus documentos requeridos' },
        { num: 3, icon: '💳', titulo: 'Pago',        desc: 'Realiza el pago de Bs. 700' },
        { num: 4, icon: '🎓', titulo: 'Acceso',      desc: 'Recibe tus credenciales' },
    ];

    const materiasCards = [
        { icon: '🖥️', nombre: 'Computación',  desc: 'Fundamentos de programación y lógica computacional',   color: '#2563eb', bg: '#eff6ff' },
        { icon: '📐', nombre: 'Matemáticas',   desc: 'Álgebra, cálculo y razonamiento matemático',           color: '#16a34a', bg: '#f0fdf4' },
        { icon: '🔬', nombre: 'Física',         desc: 'Mecánica, electromagnetismo y física moderna',        color: '#ea580c', bg: '#fff7ed' },
        { icon: '🌍', nombre: 'Inglés',          desc: 'Comprensión lectora y vocabulario técnico',           color: '#7c3aed', bg: '#f5f3ff' },
    ];

    const carrerasCards = [
        { icon: '🖥️', titulo: 'Ingeniería en Sistemas',             cupos: 150, cupoColor: '#16a34a', cupoFondo: '#dcfce7', border: '#2563eb', desc: 'Formación en desarrollo de software, bases de datos y arquitectura de sistemas.' },
        { icon: '💻', titulo: 'Ingeniería Informática',             cupos: 150, cupoColor: '#16a34a', cupoFondo: '#dcfce7', border: '#4f46e5', desc: 'Ciencias de la computación, inteligencia artificial y procesamiento de datos.' },
        { icon: '📡', titulo: 'Ing. en Redes y Telecomunicaciones', cupos: 100, cupoColor: '#1d4ed8', cupoFondo: '#dbeafe', border: '#0891b2', desc: 'Diseño e implementación de redes de comunicación y sistemas de telecomunicación.' },
        { icon: '🤖', titulo: 'Ingeniería en Robótica',             cupos: 100, cupoColor: '#1d4ed8', cupoFondo: '#dbeafe', border: '#059669', desc: 'Automatización, sistemas embebidos, robótica industrial y control.' },
    ];

    return (
        <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", overflowX: 'hidden' }}>

            {/* ════════════════════════════════════════
                NAVBAR
            ════════════════════════════════════════ */}
            <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: '#1a3a6b', boxShadow: '0 2px 16px rgba(0,0,0,0.25)', height: 64, display: 'flex', alignItems: 'center', padding: '0 2rem', justifyContent: 'space-between' }}>

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.8rem' }}>🎓</span>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.1 }}>CUP - FICCT</div>
                        <div style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.5px' }}>UAGRM</div>
                    </div>
                </div>

                {/* Center nav - hidden on mobile */}
                <div className="d-none d-md-flex" style={{ alignItems: 'center', gap: '0.25rem' }}>

                    {/* Carreras dropdown */}
                    <div ref={carrerasDD.ref} style={{ position: 'relative' }}>
                        <button onClick={carrerasDD.toggle} style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 600, fontSize: '0.92rem', cursor: 'pointer', padding: '0.5rem 0.85rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5, transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            Carreras <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>{carrerasDD.open ? '▲' : '▾'}</span>
                        </button>
                        {carrerasDD.open && (
                            <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', minWidth: 300, overflow: 'hidden', animation: 'fadeDown 0.15s ease' }}>
                                {carreras.map(c => (
                                    <div key={c.nombre} onClick={carrerasDD.close} style={{ padding: '0.75rem 1.1rem', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <span style={{ fontSize: '1.3rem' }}>{c.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{c.nombre}</div>
                                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 1 }}>{c.cupos} cupos disponibles</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Materias dropdown */}
                    <div ref={materiasDD.ref} style={{ position: 'relative' }}>
                        <button onClick={materiasDD.toggle} style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 600, fontSize: '0.92rem', cursor: 'pointer', padding: '0.5rem 0.85rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5, transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            Materias <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>{materiasDD.open ? '▲' : '▾'}</span>
                        </button>
                        {materiasDD.open && (
                            <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', minWidth: 210, overflow: 'hidden', animation: 'fadeDown 0.15s ease' }}>
                                {materias.map(m => (
                                    <div key={m.nombre} onClick={materiasDD.close} style={{ padding: '0.75rem 1.1rem', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
                                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{m.nombre}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right side: hamburger (mobile) + login */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                        className="d-md-none"
                        onClick={() => setMenuMobile(v => !v)}
                        style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.5)', color: '#fff', borderRadius: 8, padding: '0.35rem 0.6rem', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>
                        {menuMobile ? '✕' : '☰'}
                    </button>
                    <button onClick={onLogin} style={{ background: '#f59e0b', color: '#1a3a6b', fontWeight: 700, fontSize: '0.92rem', border: 'none', borderRadius: 9, padding: '0.5rem 1.35rem', cursor: 'pointer', boxShadow: '0 3px 12px rgba(245,158,11,0.4)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 18px rgba(245,158,11,0.55)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(245,158,11,0.4)'; }}>
                        LOGIN →
                    </button>
                </div>
            </nav>

            {/* Mobile menu */}
            {menuMobile && (
                <div className="d-md-none" style={{ position: 'fixed', top: 64, left: 0, right: 0, zIndex: 999, background: '#1a3a6b', borderTop: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', padding: '0.75rem 1rem' }}>
                    <div style={{ marginBottom: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                        <div style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: '0.4rem' }}>Carreras</div>
                        {[
                            { icon: '🖥️', nombre: 'Ingeniería en Sistemas', cupos: 150 },
                            { icon: '💻', nombre: 'Ingeniería Informática', cupos: 150 },
                            { icon: '📡', nombre: 'Ing. Redes y Telecomunicaciones', cupos: 100 },
                            { icon: '🤖', nombre: 'Ingeniería en Robótica', cupos: 100 },
                        ].map(c => (
                            <div key={c.nombre} onClick={() => setMenuMobile(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.25rem', cursor: 'pointer' }}>
                                <span style={{ fontSize: '1.1rem' }}>{c.icon}</span>
                                <div>
                                    <div style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 600 }}>{c.nombre}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem' }}>{c.cupos} cupos</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ paddingTop: '0.5rem' }}>
                        <div style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: '0.4rem' }}>Materias</div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {[
                                { icon: '🖥️', nombre: 'Computación' },
                                { icon: '📐', nombre: 'Matemáticas' },
                                { icon: '🔬', nombre: 'Física' },
                                { icon: '🌍', nombre: 'Inglés' },
                            ].map(m => (
                                <div key={m.nombre} onClick={() => setMenuMobile(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', padding: '0.3rem 0' }}>
                                    <span>{m.icon}</span> {m.nombre}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: '0.5rem' }}>
                        <button onClick={() => { onRegistro(); setMenuMobile(false); }} style={{ background: '#f59e0b', color: '#1a3a6b', border: 'none', borderRadius: 8, padding: '0.6rem 1.25rem', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: '0.95rem' }}>
                            Inscribirse Ahora →
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════
                HERO
            ════════════════════════════════════════ */}
            <section style={{ minHeight: '100vh', background: '#1a3a6b', paddingTop: 64, paddingBottom: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {/* Dot pattern */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)', backgroundSize: '30px 30px', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 720, padding: '0 2rem', marginTop: '-2rem' }}>
                    {/* Badge */}
                    <div style={{ display: 'inline-block', background: 'transparent', border: '1.5px solid #f59e0b', color: '#f59e0b', borderRadius: 20, padding: '0.35rem 1rem', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '1px', marginBottom: '1.5rem' }}>
                        CUP 1-2026
                    </div>

                    {/* Title */}
                    <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 'clamp(1.75rem, 6vw, 3.6rem)', lineHeight: 1.1, marginBottom: '1.5rem' }}>
                        Sistema de Admisión<br />Universitaria<br />
                        <span style={{ color: '#f59e0b' }}>FICCT</span>
                    </h1>

                    {/* Subtitle */}
                    <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.95rem', lineHeight: 1.75, maxWidth: 580, margin: '0 auto 2.5rem' }}>
                        El Curso Preuniversitario (CUP) es la modalidad de ingreso a la Facultad de Ingeniería
                        en Ciencias de la Computación y Telecomunicaciones de la UAGRM. Mínimo de 192 horas
                        dirigido a bachilleres.
                    </p>

                    {/* CTA buttons */}
                    <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center align-items-stretch align-items-sm-center">
                        <button onClick={onRegistro} style={{ background: '#f59e0b', color: '#1a3a6b', fontWeight: 700, fontSize: '1rem', border: 'none', borderRadius: 10, padding: '0.8rem 2rem', cursor: 'pointer', boxShadow: '0 4px 18px rgba(245,158,11,0.5)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 26px rgba(245,158,11,0.6)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(245,158,11,0.5)'; }}>
                            Inscribirse Ahora →
                        </button>
                        <button onClick={scrollToCarreras} style={{ background: 'transparent', color: '#fff', fontWeight: 600, fontSize: '1rem', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 10, padding: '0.8rem 2rem', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}>
                            Ver Carreras
                        </button>
                    </div>
                </div>

                {/* Stats bar */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {[
                        { icon: '📊', num: '1000+', label: 'Postulantes' },
                        { icon: '🏫', num: '15',    label: 'Grupos' },
                        { icon: '📚', num: '4',     label: 'Carreras' },
                        { icon: '⏱️', num: '192h',  label: 'Mínimo' },
                    ].map((s, i, arr) => (
                        <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.25rem 2.5rem', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                            <span style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{s.icon}</span>
                            <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1 }}>{s.num}</span>
                            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', marginTop: '0.2rem' }}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ════════════════════════════════════════
                SOBRE EL CUP
            ════════════════════════════════════════ */}
            <section style={{ background: '#fff', padding: '80px 2rem' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <SectionTitle>¿Qué es el CUP?</SectionTitle>
                    <p style={{ textAlign: 'center', color: '#475569', fontSize: '1.05rem', lineHeight: 1.8, maxWidth: 720, margin: '0 auto 3.5rem' }}>
                        El Curso Preuniversitario de la FICCT es el proceso de admisión oficial para ingresar a las carreras de
                        ingeniería de la Universidad Autónoma Gabriel René Moreno. Los postulantes son evaluados en 4 materias
                        fundamentales durante el curso.
                    </p>
                    <div className="row g-4">
                        {[
                            { icon: '📝', titulo: 'Evaluación Integral',   desc: '3 exámenes por materia en Computación, Matemáticas, Física e Inglés' },
                            { icon: '👥', titulo: 'Grupos Organizados',    desc: 'Grupos de máximo 70 estudiantes con horarios en turnos mañana, tarde y noche' },
                            { icon: '🎓', titulo: 'Admisión Garantizada',  desc: 'Los postulantes con promedio ≥ 60 en todas las materias son admitidos' },
                        ].map(({ icon, titulo, desc }) => (
                            <div className="col-md-4" key={titulo}>
                                <div style={{ background: '#f8fafc', borderRadius: 16, padding: '2rem 1.75rem', textAlign: 'center', height: '100%', border: '1px solid #e2e8f0', transition: 'transform 0.2s, box-shadow 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                    <div style={{ fontSize: '2.8rem', marginBottom: '1rem' }}>{icon}</div>
                                    <h5 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '0.75rem' }}>{titulo}</h5>
                                    <p style={{ color: '#64748b', lineHeight: 1.65, fontSize: '0.92rem', margin: 0 }}>{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════
                CARRERAS
            ════════════════════════════════════════ */}
            <section id="carreras" style={{ background: '#f8fafc', padding: '80px 2rem' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <SectionTitle>Nuestras Carreras</SectionTitle>
                    <div className="row g-4">
                        {carrerasCards.map(c => (
                            <div className="col-md-6" key={c.titulo}>
                                <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', height: '100%', borderTop: `4px solid ${c.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,0,0,0.12)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}>
                                    <div style={{ fontSize: '2.6rem', marginBottom: '0.75rem' }}>{c.icon}</div>
                                    <h5 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '0.5rem' }}>{c.titulo}</h5>
                                    <span style={{ background: c.cupoFondo, color: c.cupoColor, borderRadius: 20, padding: '0.22rem 0.8rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block', marginBottom: '0.85rem' }}>
                                        {c.cupos} cupos disponibles
                                    </span>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>{c.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════
                PROCESO DE ADMISIÓN
            ════════════════════════════════════════ */}
            <section style={{ background: '#1a3a6b', padding: '80px 2rem' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <SectionTitle light>Proceso de Inscripción</SectionTitle>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '3rem' }}>
                        {pasos.map((paso, i) => (
                            <React.Fragment key={paso.num}>
                                <div style={{ textAlign: 'center', minWidth: 140 }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', fontSize: '1.6rem', boxShadow: '0 4px 16px rgba(245,158,11,0.5)' }}>
                                        {paso.icon}
                                    </div>
                                    <div style={{ background: '#f59e0b', color: '#1a3a6b', fontWeight: 800, fontSize: '0.7rem', borderRadius: 20, padding: '0.15rem 0.55rem', display: 'inline-block', marginBottom: '0.4rem' }}>
                                        Paso {paso.num}
                                    </div>
                                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '0.3rem' }}>{paso.titulo}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: '0.8rem', lineHeight: 1.5 }}>{paso.desc}</div>
                                </div>
                                {i < pasos.length - 1 && (
                                    <div style={{ color: '#f59e0b', fontSize: '1.8rem', fontWeight: 700, margin: '0 0.5rem', marginBottom: '2rem' }}>→</div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <button onClick={onRegistro} style={{ background: '#f59e0b', color: '#1a3a6b', fontWeight: 700, fontSize: '1.1rem', border: 'none', borderRadius: 12, padding: '0.9rem 2.5rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(245,158,11,0.5)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(245,158,11,0.65)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,158,11,0.5)'; }}>
                            Comenzar Inscripción →
                        </button>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════
                MATERIAS
            ════════════════════════════════════════ */}
            <section style={{ background: '#fff', padding: '80px 2rem' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <SectionTitle>Materias Evaluadas</SectionTitle>
                    <div className="row g-4">
                        {materiasCards.map(m => (
                            <div className="col-md-3 col-sm-6" key={m.nombre}>
                                <div style={{ background: m.bg, borderRadius: 16, padding: '2rem 1.5rem', textAlign: 'center', height: '100%', border: `2px solid ${m.color}20`, transition: 'transform 0.2s, box-shadow 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${m.color}25`; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                    <div style={{ fontSize: '2.8rem', marginBottom: '0.75rem' }}>{m.icon}</div>
                                    <h6 style={{ fontWeight: 700, color: '#1a3a6b', marginBottom: '0.5rem', fontSize: '1rem' }}>{m.nombre}</h6>
                                    <p style={{ color: '#475569', fontSize: '0.84rem', lineHeight: 1.6, marginBottom: '0.85rem' }}>{m.desc}</p>
                                    <span style={{ background: m.color, color: '#fff', borderRadius: 20, padding: '0.22rem 0.75rem', fontSize: '0.72rem', fontWeight: 700 }}>
                                        3 exámenes
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════
                FOOTER
            ════════════════════════════════════════ */}
            <footer style={{ background: '#0f2044', padding: '60px 2rem 30px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div className="row g-5 mb-4">

                        {/* Col 1 - Logo */}
                        <div className="col-md-4">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                                <span style={{ fontSize: '2rem' }}>🎓</span>
                                <div>
                                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>CUP - FICCT</div>
                                    <div style={{ color: '#f59e0b', fontSize: '0.72rem', fontWeight: 600 }}>UAGRM</div>
                                </div>
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem', lineHeight: 1.7, margin: 0 }}>
                                Sistema de Admisión Universitaria<br />
                                Universidad Autónoma Gabriel René Moreno<br />
                                Santa Cruz de la Sierra — Bolivia
                            </p>
                        </div>

                        {/* Col 2 - Contacto */}
                        <div className="col-md-4">
                            <h6 style={{ color: '#f59e0b', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.82rem' }}>Contacto</h6>
                            {[
                                { icon: '📍', text: 'Av. Busch, Ciudad Universitaria, Módulo 236 — Santa Cruz, Bolivia' },
                                { icon: '📞', text: '78422287' },
                                { icon: '✉️', text: 'fcctcup@uagrm.edu.bo' },
                            ].map(({ icon, text }) => (
                                <div key={text} style={{ display: 'flex', gap: 10, marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{icon}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.68)', fontSize: '0.85rem', lineHeight: 1.55 }}>{text}</span>
                                </div>
                            ))}
                        </div>

                        {/* Col 3 - Redes */}
                        <div className="col-md-4">
                            <h6 style={{ color: '#f59e0b', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.82rem' }}>Síguenos</h6>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                <button
                                    onClick={() => window.open('https://www.facebook.com/share/18WhkNAssk/', '_blank')}
                                    style={{ background: '#1877f2', color: '#fff', border: 'none', borderRadius: 9, padding: '0.6rem 1.1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 10, transition: 'opacity 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                    <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>f</span> Facebook
                                </button>
                                <button
                                    onClick={() => window.open('https://www.instagram.com/ficct.uagrm.oficial?igsh=Ym9lZTA0emoyNGEy', '_blank')}
                                    style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', border: 'none', borderRadius: 9, padding: '0.6rem 1.1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 10, transition: 'opacity 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                    <span style={{ fontSize: '1rem' }}>📷</span> Instagram
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', textAlign: 'center' }}>
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', margin: 0 }}>
                            FICCT © 2026 | Universidad Autónoma Gabriel René Moreno
                        </p>
                    </div>
                </div>
            </footer>

            {/* Dropdown animation */}
            <style>{`@keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
