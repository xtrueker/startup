import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { CommandCenterSidebar } from '../components/CommandCenter/CommandCenterSidebar';

const CommandCenterLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) return null; // Let App.tsx handle the loading state screen

  const role = user?.role;
  const canAccess = role === 'admin' || role === 'operator' || role === 'supervisor';

  if (!canAccess || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden font-sans theme-transition">
      <CommandCenterSidebar />
      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0" style={{ minHeight: 0 }}>
        <Outlet />
      </div>
    </div>
  );
};

export default CommandCenterLayout;
