import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import AccessDenied from './pages/AccessDenied';
import CommandCenterLayout from './layout/CommandCenterLayout';
import CommandCenter from './pages/CommandCenter';
import CitizenTracker from './pages/CitizenTracker';
import { authService } from './services/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al abrir una nueva sesión/pestaña por primera vez, asegurar que se muestre el login
    const hasActiveSession = sessionStorage.getItem('active_session');
    if (!hasActiveSession) {
      // Limpiar cualquier residuo de bypass previo
      authService.logout();
      sessionStorage.setItem('active_session', 'init');
      setIsAuthenticated(false);
      setUserRole(null);
      setLoading(false);
      return;
    }

    const token = authService.getToken();
    const role = authService.getRole();
    setIsAuthenticated(!!token);
    setUserRole(role);
    setLoading(false);
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem('active_session', 'logged_in');
    setIsAuthenticated(true);
    setUserRole(authService.getRole());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('active_session');
    authService.logout();
    setIsAuthenticated(false);
    setUserRole(null);
  };

  const isAdministrative = userRole === 'admin' || userRole === 'operator' || userRole === 'supervisor';

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 font-mono text-sm">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
        <span>Iniciando Terminal de Seguridad...</span>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
              <Navigate to={isAdministrative ? "/command-center" : "/access-denied"} replace /> : 
              <Login onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/register" 
          element={
            isAuthenticated ? 
              <Navigate to={isAdministrative ? "/command-center" : "/access-denied"} replace /> : 
              <Register />
          } 
        />
        <Route 
          path="/citizen-tracker" 
          element={<CitizenTracker />} 
        />
        <Route 
          path="/access-denied" 
          element={
            isAuthenticated ? 
              <AccessDenied onLogout={handleLogout} /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/" 
          element={
            <Navigate to={isAuthenticated ? (isAdministrative ? "/command-center" : "/access-denied") : "/login"} replace />
          } 
        />
        {/* Command Center Routes */}
        <Route 
          path="/command-center" 
          element={
            isAuthenticated && isAdministrative ? 
              <CommandCenterLayout /> : 
              <Navigate to={isAuthenticated ? "/access-denied" : "/login"} replace />
          }
        >
          <Route index element={<CommandCenter />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;