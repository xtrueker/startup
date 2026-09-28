import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../services/auth';

const CommandCenterLayout: React.FC = () => {
  const role = authService.getRole();
  const canAccess = role === 'admin' || role === 'operator' || role === 'supervisor';

  if (!canAccess && !authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#0a0a0a',
      color: '#f5f5f5',
      overflow: 'hidden'
    }}>
      <Outlet />
    </div>
  );
};

export default CommandCenterLayout;
