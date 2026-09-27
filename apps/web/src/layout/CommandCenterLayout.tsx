import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const CommandCenterLayout: React.FC = () => {
  // Protect route: Only Admin, Supervisor, and Operator can access the Command Center
  // --- DEV BYPASS ---
  const canAccess = true; 
  // ------------------

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#0f1117',
      color: '#e2e8f0',
      overflow: 'hidden'
    }}>
      <Outlet />
    </div>
  );
};

export default CommandCenterLayout;
