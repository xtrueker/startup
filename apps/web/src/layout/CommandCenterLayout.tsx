import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useCommandStore } from '../stores/useCommandStore';
import { CommandCenterSidebar } from '../components/CommandCenter/CommandCenterSidebar';

const CommandCenterLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  const sidebarOpen = useCommandStore(s => s.sidebarOpen);
  
  if (isLoading) return null; // Let App.tsx handle the loading state screen

  const role = user?.role;
  const canAccess = role === 'admin' || role === 'operator' || role === 'supervisor' || role === 'police';

  if (!canAccess || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isMapRoute = location.pathname === '/command-center' || location.pathname === '/command-center/';

  return (
    <div className="relative h-screen w-screen bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden font-sans theme-transition">
      <CommandCenterSidebar />
      <div 
        className="h-full w-full relative overflow-hidden flex flex-col min-w-0" 
        style={{ 
          minHeight: 0,
          ...(isMapRoute ? {} : { 
            marginLeft: sidebarOpen ? 326 : 70, 
            width: sidebarOpen ? 'calc(100% - 326px)' : 'calc(100% - 70px)',
            transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1)' 
          }) 
        }}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default CommandCenterLayout;
