import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import AccessDenied from './pages/AccessDenied';
import CommandCenterLayout from './layout/CommandCenterLayout';
import CommandCenter from './pages/CommandCenter';
import CitizenTracker from './pages/CitizenTracker';
import AdminOperators from './pages/Admin/Operators';
import AdminCameras from './pages/Admin/Cameras';
import AdminUsers from './pages/Admin/Teams';
import AdminEmergencies from './pages/Admin/Emergencies';
import AdminKPI from './pages/Admin/KPI';
import AdminRoles from './pages/Admin/Roles';
import { useAuthStore } from './stores/useAuthStore';

function App() {
  const { isAuthenticated, user, isLoading, checkAuth, logout } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const userRole = user?.role;
  const isAdministrative = userRole === 'admin' || userRole === 'operator' || userRole === 'supervisor' || userRole === 'police';

  if (isLoading) {
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
              <Login onLogin={checkAuth} />
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
              <AccessDenied onLogout={logout} /> : 
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
          <Route path="operators" element={<AdminOperators />} />
          <Route path="cameras" element={<AdminCameras />} />
          <Route path="teams" element={<AdminUsers />} />
          <Route path="emergencies" element={<AdminEmergencies />} />
          <Route path="kpi" element={<AdminKPI />} />
          <Route path="roles" element={<AdminRoles />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;