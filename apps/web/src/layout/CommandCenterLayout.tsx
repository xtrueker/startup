import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../services/auth';
import { CommandCenterSidebar } from '../components/CommandCenter/CommandCenterSidebar';

const CommandCenterLayout: React.FC = () => {
  const role = authService.getRole();
  const canAccess = role === 'admin' || role === 'operator' || role === 'supervisor';

  if (!canAccess && !authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0a] text-[#f5f5f5] overflow-hidden font-sans">
      <CommandCenterSidebar />
      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0" style={{ minHeight: 0 }}>
        <Outlet />
      </div>
    </div>
  );
};

export default CommandCenterLayout;
