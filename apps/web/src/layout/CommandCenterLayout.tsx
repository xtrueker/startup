import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth';

const CommandCenterLayout: React.FC = () => {
  const role = authService.getRole();
  const isAuthenticated = authService.isAuthenticated();

  // Protect route: Only Admin, Supervisor, and Operator can access the Command Center
  const canAccess = isAuthenticated && ['admin', 'supervisor', 'operator'].includes(role || '');

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#1a202c', // Dark mode background
      color: '#e2e8f0'
    }}>
      {/* Top Header */}
      <header style={{
        backgroundColor: '#2d3748',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #4a5568',
        height: '60px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#63b3ed' }}>🖥️ Command Center</h1>
          <span style={{ fontSize: '0.85rem', backgroundColor: '#4a5568', padding: '2px 8px', borderRadius: '4px' }}>
            Role: {role?.toUpperCase()}
          </span>
        </div>
        <div>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              backgroundColor: 'transparent',
              color: '#a0aec0',
              border: '1px solid #718096',
              padding: '5px 15px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← Volver al Mapa Público
          </button>
        </div>
      </header>

      {/* Main Content Area (Grid 70/30) */}
      <main style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        <Outlet />
      </main>
    </div>
  );
};

export default CommandCenterLayout;
