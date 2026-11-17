import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Cctv,
  UserCog,
  Siren,
  BarChart3,
  ChevronDown,
  Settings2,
  ShieldCheck,
  LayoutGrid,
} from 'lucide-react';

const ADMIN_MODULES = [
  {
    key: 'operators',
    label: 'Operadores',
    Icon: UserCog,
    path: '/command-center/operators',
    dot: '#0EA5E9',
  },
  {
    key: 'cameras',
    label: 'Cámaras',
    Icon: Cctv,
    path: '/command-center/cameras',
    dot: '#0EA5E9',
  },
  {
    key: 'camera-grid',
    label: 'Cuadrícula 4x4',
    Icon: LayoutGrid,
    path: '/command-center/camera-grid',
    dot: '#14B8A6',
  },
  {
    key: 'teams',
    label: 'Equipos',
    Icon: Users,
    path: '/command-center/teams',
    dot: '#10B981',
  },
  {
    key: 'roles',
    label: 'Roles',
    Icon: ShieldCheck,
    path: '/command-center/roles',
    dot: '#0EA5E9',
  },
  {
    key: 'emergencies',
    label: 'Emergencias',
    Icon: Siren,
    path: '/command-center/emergencies',
    dot: '#E11D48',
  },
  {
    key: 'kpi',
    label: 'KPI & Reportes',
    Icon: BarChart3,
    path: '/command-center/kpi',
    dot: '#D97706',
  },
] as const;

export const AdminMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAnyAdminActive = ADMIN_MODULES.some(m => location.pathname === m.path);
  const [open, setOpen] = useState(isAnyAdminActive);

  return (
    <div className="bg-transparent theme-transition">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-[var(--bg-elevated)] transition-colors group cursor-pointer"
      >
        <div className="w-7 h-7 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center flex-shrink-0 text-[var(--accent)]">
          <Settings2 size={14} />
        </div>
        <span className="flex-1 text-xs font-bold tracking-tight text-[var(--text-primary)]">
          Módulos de gestión
        </span>
        <ChevronDown
          size={15}
          className={`text-[var(--text-secondary)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Menu items */}
      {open && (
        <div className="pb-3 px-3 flex flex-col gap-1">
          {ADMIN_MODULES.map(({ key, label, Icon, path, dot }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={key}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-left transition-all duration-150 group cursor-pointer
                  ${isActive
                    ? 'liquid-pill-obsidian font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] font-medium'
                  }`}
              >
                <div className={`flex-shrink-0 ${isActive ? 'text-[#38BDF8]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'} transition-colors`}>
                  <Icon size={15} />
                </div>
                <span className="flex-1 text-[12.5px] tracking-tight">{label}</span>
                {isActive && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dot }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
