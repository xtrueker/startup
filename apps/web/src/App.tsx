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
    const token = authService.getToken();
    const role = authService.getRole();
    setIsAuthenticated(!!token);
    setUserRole(role);
    setLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setUserRole(authService.getRole());
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUserRole(null);
  };

  // --- DEV BYPASS ---
  // Forzamos la autenticación para no tener que iniciar sesión manualmente durante el desarrollo
  const isDevBypass = true; 
  const currentIsAuthenticated = isDevBypass ? true : isAuthenticated;
  const currentRole = isDevBypass ? 'admin' : userRole;
  const isAdministrative = currentRole === 'admin' || currentRole === 'operator' || currentRole === 'supervisor';
  // ------------------

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            currentIsAuthenticated ? 
              <Navigate to={isAdministrative ? "/command-center" : "/access-denied"} /> : 
              <Login onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/register" 
          element={
            currentIsAuthenticated ? 
              <Navigate to={isAdministrative ? "/command-center" : "/access-denied"} /> : 
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
            currentIsAuthenticated ? 
              <AccessDenied onLogout={handleLogout} /> : 
              <Navigate to="/login" />
          } 
        />
        <Route 
          path="/" 
          element={
            <Navigate to={currentIsAuthenticated ? (isAdministrative ? "/command-center" : "/access-denied") : "/login"} />
          } 
        />
        {/* Command Center Routes */}
        <Route 
          path="/command-center" 
          element={
            currentIsAuthenticated && isAdministrative ? 
              <CommandCenterLayout /> : 
              <Navigate to={currentIsAuthenticated ? "/access-denied" : "/login"} />
          }
        >
          <Route index element={<CommandCenter />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;