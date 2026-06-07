import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PanelDocente from './components/PanelDocente';
import PanelPostulante from './components/PanelPostulante';
import Postulantes from './components/Postulantes';
import Examenes from './components/Examenes';
import Grupos from './components/Grupos';
import Docentes from './components/Docentes';
import Postulaciones from './components/Postulaciones';
import Usuarios from './components/Usuarios';
import Bitacora from './components/Bitacora';
import Registro from './components/Registro';
import SubirDocumentos from './components/SubirDocumentos';
import PasarelaPago from './components/PasarelaPago';
import RegistroExito from './components/RegistroExito';

function App() {
    const [user, setUser] = useState(null);
    const [modulo, setModulo] = useState('dashboard');

    // Flujo de registro público: landing | login | registro | documentos | pago | exito
    const [vista, setVista] = useState('landing');
    const [datosFlujo, setDatosFlujo]     = useState(null);
    const [credenciales, setCredenciales] = useState(null);

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-User-Id': user?.id ?? '' },
            });
        } catch { /* silent */ }
        setUser(null); setModulo('dashboard'); setVista('landing');
    };

    // Usuario autenticado → app principal
    if (user) {
        if (user.rol === 'docente')     return <PanelDocente    user={user} onLogout={handleLogout} />;
        if (user.rol === 'postulante') return <PanelPostulante user={user} onLogout={handleLogout} />;
        if (modulo === 'postulantes')   return <Postulantes   user={user} onBack={() => setModulo('dashboard')} />;
        if (modulo === 'examenes')      return <Examenes      user={user} onBack={() => setModulo('dashboard')} />;
        if (modulo === 'grupos')        return <Grupos        user={user} onBack={() => setModulo('dashboard')} />;
        if (modulo === 'postulaciones') return <Postulaciones user={user} onBack={() => setModulo('dashboard')} />;
        if (modulo === 'docentes')      return <Docentes      user={user} onBack={() => setModulo('dashboard')} />;
        if (modulo === 'usuarios')      return <Usuarios      user={user} onBack={() => setModulo('dashboard')} />;
        if (modulo === 'bitacora')      return <Bitacora                  onBack={() => setModulo('dashboard')} />;
        return <Dashboard user={user} onLogout={handleLogout} onModulo={setModulo} />;
    }

    // Landing page pública
    if (vista === 'landing') {
        return (
            <LandingPage
                onLogin={() => setVista('login')}
                onRegistro={() => setVista('registro')}
            />
        );
    }

    // Paso 1 — Datos personales
    if (vista === 'registro') {
        return (
            <Registro
                onDocumentos={(datos) => { setDatosFlujo(datos); setVista('documentos'); }}
                onVolver={() => setVista('login')}
            />
        );
    }

    // Paso 2 — Subida de documentos
    if (vista === 'documentos') {
        return (
            <SubirDocumentos
                datos={datosFlujo}
                onPagar={(datos) => { setDatosFlujo(datos); setVista('pago'); }}
                onVolver={() => setVista('registro')}
            />
        );
    }

    // Paso 3 — Pasarela de pago
    if (vista === 'pago') {
        return (
            <PasarelaPago
                datos={datosFlujo}
                onExito={(creds) => { setCredenciales(creds); setVista('exito'); }}
                onVolver={() => setVista('documentos')}
            />
        );
    }

    // Paso 4 — Credenciales de acceso
    if (vista === 'exito') {
        return (
            <RegistroExito
                credenciales={credenciales}
                onLogin={() => setVista('login')}
            />
        );
    }

    // Login
    return (
        <Login
            onLogin={setUser}
            onRegistro={() => setVista('registro')}
        />
    );
}

const container = document.getElementById('app');
if (container) createRoot(container).render(<App />);
