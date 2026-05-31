import React, { useState, useEffect } from 'react';

/**
 * Panel administrativo principal del sistema CUP-FICCT.
 *
 * Muestra estadisticas de la gestion actual en tiempo real (cargadas al montar el componente)
 * y un menu de tarjetas para navegar a cada modulo del sistema.
 *
 * @param {Object}   user      Datos del usuario autenticado { id, username, rol }
 * @param {Function} onLogout  Callback para cerrar sesion (llama a POST /api/logout)
 * @param {Function} onModulo  Callback para navegar a un modulo especifico
 */
function Dashboard({ user, onLogout, onModulo }) {
    // Estadisticas de la gestion actual cargadas desde /api/dashboard/estadisticas
    const [stats, setStats] = useState({
        total_inscritos: '-',
        total_aprobados: '-',
        total_reprobados: '-',
        total_grupos: '-',
    });

    // Carga las estadisticas al montar el componente (una sola vez)
    useEffect(() => {
        fetch('/api/dashboard/estadisticas')
            .then(r => r.json())
            .then(data => setStats(data))
            .catch(() => {});
    }, []);

    return (
        <div>
            {/* Navbar */}
            <nav className="navbar navbar-dark bg-primary px-4">
                <span className="navbar-brand fw-bold">CUP - FICCT</span>
                <div className="d-flex align-items-center gap-3">
                    <span className="text-white">👤 {user.username} ({user.rol})</span>
                    <button className="btn btn-outline-light btn-sm" onClick={onLogout}>
                        Cerrar Sesión
                    </button>
                </div>
            </nav>

            {/* Dashboard */}
            <div className="container-fluid p-4">
                <h4 className="mb-4">Panel Administrativo</h4>

                {/* Tarjetas de estadísticas */}
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="card text-white bg-primary">
                            <div className="card-body">
                                <h6 className="card-title">Total Inscritos</h6>
                                <h2 className="fw-bold">{stats.total_inscritos}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-success">
                            <div className="card-body">
                                <h6 className="card-title">Aprobados</h6>
                                <h2 className="fw-bold">{stats.total_aprobados}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-danger">
                            <div className="card-body">
                                <h6 className="card-title">Reprobados</h6>
                                <h2 className="fw-bold">{stats.total_reprobados}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-white bg-warning">
                            <div className="card-body">
                                <h6 className="card-title">Grupos Habilitados</h6>
                                <h2 className="fw-bold">{stats.total_grupos}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menú de módulos */}
                <div className="row g-3">
                    <div className="col-md-3">
                        <div className="card h-100 shadow-sm">
                            <div className="card-body text-center p-4">
                                <div style={{fontSize:'2.5rem'}}>👤</div>
                                <h5 className="mt-2">Usuarios y Roles</h5>
                                <p className="text-muted small">Gestionar cuentas y permisos del sistema</p>
                                <button className="btn btn-primary btn-sm" onClick={() => onModulo('usuarios')}>Ir al módulo</button>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card h-100 shadow-sm">
                            <div className="card-body text-center p-4">
                                <div style={{fontSize:'2.5rem'}}>👨‍🏫</div>
                                <h5 className="mt-2">Docentes</h5>
                                <p className="text-muted small">Gestionar docentes y sus asignaciones</p>
                                <button className="btn btn-primary btn-sm" onClick={() => onModulo('docentes')}>Ir al módulo</button>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card h-100 shadow-sm">
                            <div className="card-body text-center p-4">
                                <div style={{fontSize:'2.5rem'}}>👥</div>
                                <h5 className="mt-2">Postulantes</h5>
                                <p className="text-muted small">Registrar y gestionar postulantes</p>
                                <button className="btn btn-primary btn-sm" onClick={() => onModulo('postulantes')}>Ir al módulo</button>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card h-100 shadow-sm">
                            <div className="card-body text-center p-4">
                                <div style={{fontSize:'2.5rem'}}>📋</div>
                                <h5 className="mt-2">Postulaciones</h5>
                                <p className="text-muted small">Gestionar postulaciones y estados de admisión</p>
                                <button className="btn btn-primary btn-sm" onClick={() => onModulo('postulaciones')}>Ir al módulo</button>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card h-100 shadow-sm">
                            <div className="card-body text-center p-4">
                                <div style={{fontSize:'2.5rem'}}>📝</div>
                                <h5 className="mt-2">Exámenes</h5>
                                <p className="text-muted small">Registrar notas y calcular promedios</p>
                                <button className="btn btn-primary btn-sm" onClick={() => onModulo('examenes')}>Ir al módulo</button>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card h-100 shadow-sm">
                            <div className="card-body text-center p-4">
                                <div style={{fontSize:'2.5rem'}}>🏫</div>
                                <h5 className="mt-2">Grupos</h5>
                                <p className="text-muted small">Asignación automática de grupos</p>
                                <button className="btn btn-primary btn-sm" onClick={() => onModulo('grupos')}>Ir al módulo</button>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card h-100 shadow-sm">
                            <div className="card-body text-center p-4">
                                <div style={{fontSize:'2.5rem'}}>📋</div>
                                <h5 className="mt-2">Bitácora</h5>
                                <p className="text-muted small">Historial de auditoría del sistema</p>
                                <button className="btn btn-primary btn-sm" onClick={() => onModulo('bitacora')}>Ir al módulo</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
