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
    accent: 'text-[#efede3]',
    activeBg: 'bg-[#1c1c1c] border-[#333333]',
    dot: '#a3a3a3',
  },
  {
    key: 'cameras',
    label: 'Cámaras',
    Icon: Cctv,
    path: '/command-center/cameras',
    accent: 'text-[#efede3]',
    activeBg: 'bg-[#1c1c1c] border-[#333333]',
    dot: '#a3a3a3',
  },
  {
    key: 'teams',
    label: 'Equipos',
    Icon: Users,
    path: '/command-center/teams',
    accent: 'text-[#efede3]',
    activeBg: 'bg-[#1c1c1c] border-[#333333]',
    dot: '#a3a3a3',
  },
  {
    key: 'roles',
    label: 'Roles',
    Icon: ShieldCheck,
    path: '/command-center/roles',
    accent: 'text-[#efede3]',
    activeBg: 'bg-[#1c1c1c] border-[#333333]',
    dot: '#a3a3a3',
  },
  {
    key: 'emergencies',
    label: 'Emergencias',
    Icon: Siren,
    path: '/command-center/emergencies',
    accent: 'text-[#efede3]',
    activeBg: 'bg-[#1c1c1c] border-[#333333]',
    dot: '#e11d48',
  },
  {
    key: 'kpi',
    label: 'KPI & Reportes',
    Icon: BarChart3,
    path: '/command-center/kpi',
    accent: 'text-[#efede3]',
    activeBg: 'bg-[#1c1c1c] border-[#333333]',
    dot: '#a3a3a3',
  },
] as const;

export const AdminMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAnyAdminActive = ADMIN_MODULES.some(m => location.pathname === m.path);
  const [open, setOpen] = useState(isAnyAdminActive);

  return (
    <div className="border-t border-[#262626] bg-[#0d0d0d]">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-[#161616] transition-colors group"
      >
        <div className="w-6 h-6 rounded-md bg-[#1a1a2e] border border-[#2d2d5e] flex items-center justify-center flex-shrink-0">
          <Settings2 size={13} className="text-[#818cf8]" />
        </div>
        <span className="flex-1 text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] group-hover:text-[#d4d4d4] transition-colors">
          Módulos Admin
        </span>
        <ChevronDown
          size={14}
          className={`text-[#525252] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Menu items */}
      {open && (
        <div className="pb-2 px-2 flex flex-col gap-0.5">
          {ADMIN_MODULES.map(({ key, label, Icon, path, accent, activeBg, dot }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={key}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-150 group
                  ${isActive
                    ? `${activeBg} text-[#f5f5f5]`
                    : 'border-transparent text-[#8c8c8c] hover:bg-[#161616] hover:text-[#d4d4d4] hover:border-[#2a2a2a]'
                  }`}
              >
                <div className={`flex-shrink-0 ${isActive ? accent : 'text-[#525252] group-hover:text-[#737373]'} transition-colors`}>
                  <Icon size={15} />
                </div>
                <span className="flex-1 text-[12px] font-semibold">{label}</span>
                {isActive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
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
