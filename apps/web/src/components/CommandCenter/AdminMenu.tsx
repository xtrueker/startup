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
} from 'lucide-react';

const ADMIN_MODULES = [
  {
    key: 'operators',
    label: 'Operadores',
    Icon: UserCog,
    path: '/command-center/operators',
    dot: '#a3a3a3',
  },
  {
    key: 'cameras',
    label: 'Cámaras',
    Icon: Cctv,
    path: '/command-center/cameras',
    dot: '#a3a3a3',
  },
  {
    key: 'teams',
    label: 'Equipos',
    Icon: Users,
    path: '/command-center/teams',
    dot: '#a3a3a3',
  },
  {
    key: 'roles',
    label: 'Roles',
    Icon: ShieldCheck,
    path: '/command-center/roles',
    dot: '#a3a3a3',
  },
  {
    key: 'emergencies',
    label: 'Emergencias',
    Icon: Siren,
    path: '/command-center/emergencies',
    dot: '#e11d48',
  },
  {
    key: 'kpi',
    label: 'KPI & Reportes',
    Icon: BarChart3,
    path: '/command-center/kpi',
    dot: '#a3a3a3',
  },
] as const;

export const AdminMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAnyAdminActive = ADMIN_MODULES.some(m => location.pathname === m.path);
  const [open, setOpen] = useState(isAnyAdminActive);

  return (
    <div className="bg-[var(--bg-sidebar)] shadow-xs theme-transition">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left bg-[#f9f9f9] dark:bg-[#111112] hover:bg-[#f4f2f0] dark:hover:bg-[var(--bg-elevated)] transition-colors group cursor-pointer"
      >
        <div className="w-6 h-6 rounded bg-[var(--accent-bg)] shadow-xs flex items-center justify-center flex-shrink-0">
          <Settings2 size={13} className="text-[var(--accent)]" />
        </div>
        <span className="flex-1 text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] transition-colors">
          Módulos Admin
        </span>
        <ChevronDown
          size={14}
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-all duration-150 group cursor-pointer
                  ${isActive
                    ? 'bg-[#ece9e6] dark:bg-[var(--bg-elevated)] shadow-xs text-[var(--text-primary)] font-bold'
                    : 'text-[var(--text-secondary)] hover:bg-[#f4f2f0] dark:hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-xs font-semibold'
                  }`}
              >
                <div className={`flex-shrink-0 ${isActive ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'} transition-colors`}>
                  <Icon size={16} />
                </div>
                <span className="flex-1 text-[12px]">{label}</span>
                {isActive && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 shadow-xs"
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
