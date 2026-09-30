import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { useCommandStore } from '../../stores/useCommandStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { AdminMenu } from './AdminMenu';
import { AudioStreamer } from './AudioStreamer';
import {
  Map,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Cctv,
  Users,
  Siren,
  BarChart3,
  Filter,
  ChevronDown,
  Crosshair,
  Skull,
  Car,
  Bomb,
  LayoutList,
  Clock,
  MapPin,
} from 'lucide-react';

export const CommandCenterSidebar: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { connected } = useSocket({ namespace: '/operators' });
  const { user, logout } = useAuthStore();
  const userRole = user?.role || 'ADMIN';
  const userName = user?.fullName || 'Operador Táctico';
  
  const {
    activeAlerts,
    toggleHeatmap,
    heatmapEnabled,
    setFilters,
    filterType,
    focusMapOnAlert,
    focusedAlertId,
  } = useCommandStore();

  const activeCount = Object.keys(activeAlerts).length;

  const getAlertType = (alert: { description?: string; type?: string }): string => {
    const raw = (alert.description || alert.type || '').toLowerCase();
    if (raw.includes('homicidio') || raw.includes('asesinato') || raw.includes('muerte')) return 'homicidio';
    if (raw.includes('atentado') || raw.includes('explosivo') || raw.includes('bomba') || raw.includes('terrorismo')) return 'atentado';
    if (raw.includes('accidente') || raw.includes('choque') || raw.includes('colision') || raw.includes('colisión')) return 'accidente';
    if (raw.includes('robo') || raw.includes('hurto') || raw.includes('asalto')) return 'robo';
    return 'robo';
  };

  const TYPE_PRIORITY: Record<string, number> = { atentado: 100, homicidio: 80, robo: 50, accidente: 30 };

  const GENERIC_ADDRESSES = ['coordenadas provistas', 'ubicación gps', 'ubicacion gps', 'gps', ''];
  const formatAddress = (loc: { address?: string; lat: number; lng: number }): string => {
    const addr = (loc.address || '').trim();
    if (GENERIC_ADDRESSES.includes(addr.toLowerCase())) {
      if (loc.lat === 0 && loc.lng === 0) return 'Sin ubicación';
      return `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
    }
    return addr;
  };

  const sortedAlerts = Object.values(activeAlerts)
    .filter(alert => filterType === 'all' || getAlertType(alert) === filterType)
    .sort((a, b) => {
      let scoreA = TYPE_PRIORITY[getAlertType(a)] ?? 0;
      let scoreB = TYPE_PRIORITY[getAlertType(b)] ?? 0;
      const minsA = (Date.now() - new Date(a.timestamp).getTime()) / 60000;
      const minsB = (Date.now() - new Date(b.timestamp).getTime()) / 60000;
      scoreA += minsA * 2;
      scoreB += minsB * 2;
      return scoreB - scoreA;
    });

  const handleAlertCardClick = (alertId: string) => {
    if (location.pathname !== '/command-center') {
      navigate('/command-center');
    }
    focusMapOnAlert(focusedAlertId === alertId ? null : alertId);
  };

  const handleDispatchClick = () => {
    if (location.pathname !== '/command-center') {
      navigate('/command-center');
    }
    focusMapOnAlert(null);
  };

  return (
    <aside
      style={{ width: sidebarOpen ? 320 : 64, transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      className="relative bg-[#0b0b0b] border-r border-[#262626] flex flex-col z-30 shadow-2xl flex-shrink-0 h-full"
    >
      {/* ── Toggle button flotante ÚNICO en el borde ── */}
      <button
        onClick={() => setSidebarOpen(v => !v)}
        title={sidebarOpen ? 'Colapsar barra lateral' : 'Desplegar barra lateral'}
        className="absolute -right-6 top-6 z-50 w-7 h-7 rounded-full bg-[#1c1c1c] hover:bg-[#27272a] border border-[#3f3f46] hover:border-[#e4efed] text-[#e4e4e7] hover:text-white flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all cursor-pointer p-0"
      >
        {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
      </button>

      {/* ── COLLAPSED: barra de iconos completa ── */}
      {!sidebarOpen && (
        <div className="w-[64px] h-full flex flex-col items-center py-3 gap-2 bg-[#0f0f0f] overflow-y-auto overflow-x-hidden custom-scrollbar select-none">
          {/* Avatar del Operador */}
          <div className="relative flex-shrink-0 my-0.5" title={`Operador: ${userRole}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#2a2a2a] to-[#181818] flex items-center justify-center font-black text-white text-sm border border-[#3a3a3a] shadow-md">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10b981] border-2 border-[#0d0d0d] shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
          </div>

          <div className="w-8 h-px bg-[#262626] my-0.5" />

          {/* Central de Despacho (Icono de Mapa) */}
          <button
            onClick={handleDispatchClick}
            title="Central de Despacho (Mapa Táctico)"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors p-0 ${
              location.pathname === '/command-center'
                ? 'bg-[#171717] border border-[#383838] text-[#efede3]'
                : 'text-[#8c8c8c] hover:text-[#efede3] hover:bg-[#1a1a1a] border border-transparent hover:border-[#262626]'
            }`}
          >
            <Map size={18} />
          </button>

          {/* Botón de Heatmap (Inmediatamente abajo de Central de Despacho) */}
          <button
            onClick={toggleHeatmap}
            title={heatmapEnabled ? 'Heatmap: ACTIVADO' : 'Activar Heatmap'}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors p-0 ${
              heatmapEnabled
                ? 'bg-[#222222] border border-[#4f46e5]/70 text-[#818cf8] shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                : 'text-[#8c8c8c] hover:text-[#efede3] hover:bg-[#1a1a1a] border border-transparent hover:border-[#262626]'
            }`}
          >
            <Layers size={18} />
          </button>

          <div className="w-8 h-px bg-[#262626] my-0.5" />

          {/* 1. Módulo Operadores */}
          <button
            onClick={() => navigate('/command-center/operators')}
            title="Módulo: Operadores"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors p-0 ${
              location.pathname === '/command-center/operators'
                ? 'bg-[#222222] border border-[#383838] text-[#efede3]'
                : 'text-[#8c8c8c] hover:text-[#efede3] hover:bg-[#1a1a1a] border border-transparent hover:border-[#262626]'
            }`}
          >
            <UserCog size={18} />
          </button>

          {/* 2. Módulo Cámaras */}
          <button
            onClick={() => navigate('/command-center/cameras')}
            title="Módulo: Cámaras de Seguridad"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors p-0 ${
              location.pathname === '/command-center/cameras'
                ? 'bg-[#222222] border border-[#383838] text-[#efede3]'
                : 'text-[#8c8c8c] hover:text-[#efede3] hover:bg-[#1a1a1a] border border-transparent hover:border-[#262626]'
            }`}
          >
            <Cctv size={18} />
          </button>

          {/* 3. Módulo Usuarios / Equipos */}
          <button
            onClick={() => navigate('/command-center/teams')}
            title="Módulo: Equipos"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors p-0 ${
              location.pathname === '/command-center/teams'
                ? 'bg-[#222222] border border-[#383838] text-[#efede3]'
                : 'text-[#8c8c8c] hover:text-[#efede3] hover:bg-[#1a1a1a] border border-transparent hover:border-[#262626]'
            }`}
          >
            <Users size={18} />
          </button>

          {/* 4. Módulo Roles */}
          <button
            onClick={() => navigate('/command-center/roles')}
            title="Módulo: Roles y Permisos"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors p-0 ${
              location.pathname === '/command-center/roles'
                ? 'bg-[#222222] border border-[#383838] text-[#efede3]'
                : 'text-[#8c8c8c] hover:text-[#efede3] hover:bg-[#1a1a1a] border border-transparent hover:border-[#262626]'
            }`}
          >
            <ShieldCheck size={18} />
          </button>

          {/* 5. Módulo Emergencias */}
          <button
            onClick={() => navigate('/command-center/emergencies')}
            title={`Módulo: Emergencias (${activeCount} activas)`}
            className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors p-0 ${
              location.pathname === '/command-center/emergencies'
                ? 'bg-[#222222] border border-[#383838] text-[#efede3]'
                : 'text-[#8c8c8c] hover:text-[#efede3] hover:bg-[#1a1a1a] border border-transparent hover:border-[#262626]'
            }`}
          >
            <Siren size={18} />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[15px] h-[15px] rounded-full bg-[#e11d48] text-[9px] font-bold text-white flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>

          {/* 6. Módulo KPI */}
          <button
            onClick={() => navigate('/command-center/kpi')}
            title="Módulo: KPI & Reportes"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors p-0 ${
              location.pathname === '/command-center/kpi'
                ? 'bg-[#222222] border border-[#383838] text-[#efede3]'
                : 'text-[#8c8c8c] hover:text-[#efede3] hover:bg-[#1a1a1a] border border-transparent hover:border-[#262626]'
            }`}
          >
            <BarChart3 size={18} />
          </button>

          {/* Espaciador flexible */}
          <div className="flex-1 min-h-[8px]" />

          {/* Logout */}
          <button
            onClick={() => {
              sessionStorage.removeItem('active_session');
              logout();
              navigate('/login');
            }}
            title="Cerrar Sesión"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#737373] hover:text-[#f87171] hover:bg-[#1a1a1a] border border-transparent hover:border-[#262626] transition-colors mb-2 p-0"
          >
            <LogOut size={17} />
          </button>
        </div>
      )}

      {/* ── EXPANDED: full sidebar content ── */}
      {sidebarOpen && (
        <div className="w-[320px] h-full flex flex-col overflow-hidden">
          {/* User Info + Logout */}
          <div className="px-4 py-3 border-b border-[#262626] bg-[#121212] flex items-center gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#262626] to-[#141414] flex items-center justify-center font-black text-white text-sm shadow-md border border-[#333333]">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10b981] border-2 border-[#121212] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            </div>
            {/* Name & Role */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#efede3] truncate">{userName}</div>
              <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wider font-mono">{userRole}</div>
            </div>
            {/* Logout Button */}
            <button
              onClick={() => {
                sessionStorage.removeItem('active_session');
                logout();
                navigate('/login');
              }}
              title="Cerrar Sesión"
              className="flex items-center gap-1.5 bg-[#4c0519]/25 hover:bg-[#881337]/35 text-[#fda4af] hover:text-white border border-[#881337]/40 hover:border-[#e11d48]/50 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 flex-shrink-0"
            >
              <LogOut size={13} />
              <span>Salir</span>
            </button>
          </div>

          {/* Header con Central de Despacho y Heatmap directamente abajo */}
          <div className="p-4 border-b border-[#262626] bg-[#121212]/90 backdrop-blur flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleDispatchClick}
                className="flex items-center gap-2 text-[#efede3] hover:text-white font-black uppercase tracking-widest text-sm text-left transition-colors"
              >
                <Map size={18} className="text-[#818cf8]" /> Central de Despacho
              </button>
              
            </div>

            {/* Botón de Heatmap abajo del botón de Central de Despacho */}
            <button
              onClick={toggleHeatmap}
              className={`flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                heatmapEnabled
                  ? 'bg-[#1e1b4b] text-[#c7d2fe] border border-[#4f46e5]/70 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                  : 'bg-[#171717] text-[#a3a3a3] border border-[#262626] hover:bg-[#202020] hover:text-white'
              }`}
            >
              <Layers size={14} className={heatmapEnabled ? 'text-[#818cf8]' : 'text-[#737373]'} />
              <span>{heatmapEnabled ? 'Heatmap: Activado' : 'Activar Análisis Heatmap'}</span>
            </button>
          </div>

          {/* Filtro por Tipo */}
          {(() => {
            const TYPE_OPTIONS = [
              { key: 'all',       label: 'Todos los Tipos', Icon: LayoutList,   iconColor: 'text-slate-400' },
              { key: 'robo',      label: 'Robo',            Icon: Crosshair,    iconColor: 'text-zinc-300' },
              { key: 'homicidio', label: 'Homicidio',       Icon: Skull,        iconColor: 'text-zinc-300' },
              { key: 'accidente', label: 'Accidente',       Icon: Car,          iconColor: 'text-zinc-300' },
              { key: 'atentado',  label: 'Atentado',        Icon: Bomb,         iconColor: 'text-white' },
            ] as const;
            const selected = TYPE_OPTIONS.find(o => o.key === filterType) ?? TYPE_OPTIONS[0];
            return (
              <div className="px-4 py-3 bg-[#121212]/50 backdrop-blur border-b border-[#262626] flex flex-col gap-2">
                <h3 className="text-[10px] uppercase text-[#737373] font-bold flex items-center gap-1.5 tracking-wider">
                  <Filter size={11} className="text-[#818cf8]" /> Filtrar por Tipo
                </h3>
                <div className="relative">
                  <button
                    onClick={() => setTypeDropdownOpen(v => !v)}
                    className="w-full flex items-center gap-2 bg-[#141414] border border-[#262626] hover:border-[#383838] focus:border-[#6366f1] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] transition-all duration-150 outline-none"
                  >
                    <selected.Icon size={14} className={selected.iconColor} />
                    <span className="flex-1 text-left text-[13px] font-medium">{selected.label}</span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${typeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {typeDropdownOpen && (
                    <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[#141414] border border-[#262626] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden">
                      {TYPE_OPTIONS.map(({ key, label, Icon }) => (
                        <button
                          key={key}
                          onClick={() => { setFilters({ type: key }); setTypeDropdownOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${
                            filterType === key
                              ? 'bg-[#202026] text-white font-bold border-l-2 border-[#6366f1]'
                              : 'text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-white'
                          }`}
                        >
                          <Icon size={14} className={filterType === key ? 'text-white' : 'text-zinc-500'} />
                          <span className="font-medium">{label}</span>
                          {filterType === key && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Lista de Eventos Virtualizada */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
            <h3 className="text-xs uppercase text-[#efede3] font-bold mb-2 flex items-center gap-2 tracking-wider">
              <Activity size={14} className="text-[#818cf8]" /> {`Emergencias Activas (${activeCount})`}
            </h3>

            {sortedAlerts.map(alert => {
              const minsWaiting = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 60000);
              const isOverdue = minsWaiting > 5;
              const alertType = getAlertType(alert);
              const TYPE_META = {
                robo:      { Icon: Crosshair, label: 'Robo',      color: 'text-[#fcd34d] bg-[#78350f]/35 border-[#b45309]/45' },
                homicidio: { Icon: Skull,     label: 'Homicidio', color: 'text-[#fca5a5] bg-[#7f1d1d]/35 border-[#b91c1c]/45 font-bold' },
                accidente: { Icon: Car,       label: 'Accidente', color: 'text-[#fdba74] bg-[#7c2d12]/35 border-[#c2410c]/45' },
                atentado:  { Icon: Bomb,      label: 'Atentado',  color: 'text-[#f87171] bg-[#450a0a]/55 border-[#991b1b]/55 font-black' },
              } as const;
              const meta = TYPE_META[alertType as keyof typeof TYPE_META] ?? TYPE_META.robo;
              const TypeIcon = meta.Icon;
              const isFocused = focusedAlertId === alert.id;

              return (
                <div
                  key={alert.id}
                  onClick={() => handleAlertCardClick(alert.id)}
                  className={`rounded-lg border flex flex-col cursor-pointer transition-all duration-200 overflow-hidden
                    ${isFocused ? 'bg-[#171717] border-[#444444] ring-1 ring-[#efede3]/20 shadow-md' : 'bg-[#121212] border-[#222222] hover:border-[#303030] hover:bg-[#161616]'}
                    ${isOverdue ? 'border-l-[3px] border-l-[#f43f5e]' : ''}`}
                >
                  {/* ── Always visible: minimal info ─────────────── */}
                  <div className="px-3 py-2.5 flex flex-col gap-1.5">
                    {/* Row 1: type badge + SLA */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.color}`}>
                        <TypeIcon size={10} /> {meta.label}
                      </span>
                      {isOverdue && (
                        <span className="text-[9px] bg-[#881337]/50 text-[#fda4af] border border-[#e11d48]/50 px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                          SLA VENCIDO
                        </span>
                      )}
                    </div>
                    {/* Row 2: address */}
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin size={9} className="flex-shrink-0 text-[#737373]" />
                      <span className="truncate">{formatAddress(alert.sourceLocation)}</span>
                    </div>
                    {/* Row 3: time + status */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#737373] flex items-center gap-1">
                        <Clock size={9} />
                        {minsWaiting < 60
                          ? `${minsWaiting}m`
                          : `${Math.floor(minsWaiting / 60)}h ${minsWaiting % 60}m`}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        alert.status === 'pending'   ? 'text-white bg-zinc-800 border border-zinc-700' :
                        alert.status === 'reviewing' ? 'text-zinc-300 bg-zinc-900 border border-zinc-800' :
                        alert.status === 'verified'  ? 'text-zinc-200 bg-zinc-800 border border-zinc-700 font-semibold' :
                        alert.status === 'resolved'  ? 'text-zinc-500 bg-black border border-zinc-800 line-through' :
                        'text-[#818cf8] bg-zinc-800'
                      }`}>{alert.status}</span>
                    </div>
                  </div>

                  {/* ── Expanded: full details (only when focused) ─ */}
                  {isFocused && (
                    <div className="px-3 pb-3 flex flex-col gap-2 border-t border-zinc-700 pt-2.5 animate-in slide-in-from-top-1 duration-150">
                      {/* Description */}
                      <div className="text-xs text-[#efede3] font-medium leading-snug">{alert.description}</div>
                      {/* Alert ID */}
                      <div className="text-[10px] font-mono text-[#737373]">ID: {alert.id.split('-')[0]}...</div>
                      {/* User */}
                      <div className="text-[10px] text-[#737373] flex items-center gap-1">
                        <span className="text-slate-600">Ciudadano:</span> {alert.userId}
                      </div>
                      {/* Timestamp */}
                      <div className="text-[10px] text-[#737373]">
                        {new Date(alert.timestamp).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      </div>
                      {/* Audio evidence */}
                      <div className="mt-1">
                        <AudioStreamer alertId={alert.id} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {activeCount === 0 && (
              <div className="p-5 flex flex-col gap-4">
                <div className="text-xs text-slate-400 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-inner flex flex-col gap-1">
                  <span className="text-emerald-400">&gt; Zona Nacional Despejada</span>
                  <span className="text-[#737373]">&gt; Escuchando frecuencia principal...</span>
                </div>
              </div>
            )}
          </div>

          {/* Admin Navigation Menu */}
          <AdminMenu />
        </div>
      )}
    </aside>
  );
};
