import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { useCommandStore } from '../../stores/useCommandStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { AdminMenu } from './AdminMenu';
import { AudioStreamer } from './AudioStreamer';
import {
  Map,
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
  ChevronDown,
  Crosshair,
  Skull,
  Car,
  Bomb,
  LayoutList,
  Clock,
  MapPin,
  Sun,
  Moon,
} from 'lucide-react';

export const CommandCenterSidebar: React.FC = () => {
  const sidebarOpen = useCommandStore(s => s.sidebarOpen);
  const setSidebarOpen = useCommandStore(s => s.setSidebarOpen);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  useSocket({ namespace: '/operators' });
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
      style={{
        width: sidebarOpen ? 320 : 64,
        height: 'calc(100% - 12px)',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}
      className="absolute top-[6px] left-[6px] bottom-[6px] z-30 bg-[var(--bg-sidebar)] flex flex-col flex-shrink-0 theme-transition rounded-[12px] border border-neutral-200/80 dark:border-neutral-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] pointer-events-auto"
    >
      {/* ── Toggle button flotante ÚNICO en el borde ── */}
      <button
        onClick={() => setSidebarOpen(v => !v)}
        title={sidebarOpen ? 'Colapsar barra lateral' : 'Desplegar barra lateral'}
        className="absolute -right-5 top-6 z-50 w-7 h-7 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center shadow-lg transition-all cursor-pointer p-0"
      >
        {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
      </button>

      {/* ── COLLAPSED: barra de iconos completa ── */}
      {!sidebarOpen && (
        <div className="w-[64px] h-full flex flex-col items-center py-3 gap-2 bg-[var(--bg-sidebar)] overflow-y-auto overflow-x-hidden custom-scrollbar select-none rounded-[12px]">
          {/* Avatar del Operador */}
          <div className="relative flex-shrink-0 my-0.5" title={`Operador: ${userRole}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#2a2a2a] to-[#181818] flex items-center justify-center font-black text-white text-sm shadow-md">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10b981] border-2 border-[var(--bg-surface)] shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
          </div>

          <div className="w-8 h-px bg-neutral-200 dark:bg-neutral-800 my-1" />

          {/* Central de Despacho (Icono de Mapa) */}
          <button
            onClick={handleDispatchClick}
            title="Central de Despacho (Mapa Táctico)"
            className={`w-9 h-9 rounded flex items-center justify-center transition-all p-0 shadow-xs ${
              location.pathname === '/command-center'
                ? 'bg-[var(--brand)] text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Map size={18} />
          </button>

          {/* Botón de Heatmap (Inmediatamente abajo de Central de Despacho) */}
          <button
            onClick={toggleHeatmap}
            title={heatmapEnabled ? 'Heatmap: ACTIVADO' : 'Activar Heatmap'}
            className={`w-9 h-9 rounded flex items-center justify-center transition-all p-0 ${
              heatmapEnabled
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Layers size={18} />
          </button>

          <div className="w-8 h-px bg-neutral-200 dark:bg-neutral-800 my-1" />

          {/* 1. Módulo Operadores */}
          <button
            onClick={() => navigate('/command-center/operators')}
            title="Módulo: Operadores"
            className={`w-9 h-9 rounded flex items-center justify-center transition-all p-0 ${
              location.pathname === '/command-center/operators'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <UserCog size={18} />
          </button>

          {/* 2. Módulo Cámaras */}
          <button
            onClick={() => navigate('/command-center/cameras')}
            title="Módulo: Cámaras de Seguridad"
            className={`w-9 h-9 rounded flex items-center justify-center transition-all p-0 ${
              location.pathname === '/command-center/cameras'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Cctv size={18} />
          </button>

          {/* 3. Módulo Usuarios / Equipos */}
          <button
            onClick={() => navigate('/command-center/teams')}
            title="Módulo: Equipos"
            className={`w-9 h-9 rounded flex items-center justify-center transition-all p-0 ${
              location.pathname === '/command-center/teams'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Users size={18} />
          </button>

          {/* 4. Módulo Roles */}
          <button
            onClick={() => navigate('/command-center/roles')}
            title="Módulo: Roles y Permisos"
            className={`w-9 h-9 rounded flex items-center justify-center transition-all p-0 ${
              location.pathname === '/command-center/roles'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <ShieldCheck size={18} />
          </button>

          {/* 5. Módulo Emergencias */}
          <button
            onClick={() => navigate('/command-center/emergencies')}
            title={`Módulo: Emergencias (${activeCount} activas)`}
            className={`relative w-9 h-9 rounded flex items-center justify-center transition-all p-0 ${
              location.pathname === '/command-center/emergencies'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Siren size={18} />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[15px] h-[15px] rounded-full bg-red-600 text-[9px] font-bold text-white flex items-center justify-center shadow-xs">
                {activeCount}
              </span>
            )}
          </button>

          {/* 6. Módulo KPI */}
          <button
            onClick={() => navigate('/command-center/kpi')}
            title="Módulo: KPI & Reportes"
            className={`w-9 h-9 rounded flex items-center justify-center transition-all p-0 ${
              location.pathname === '/command-center/kpi'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <BarChart3 size={18} />
          </button>

          {/* Espaciador flexible */}
          <div className="flex-1 min-h-[8px]" />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Cambiar a Tema Claro' : 'Cambiar a Tema Oscuro'}
            className="w-9 h-9 rounded flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] shadow-xs transition-colors p-0"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Logout */}
          <button
            onClick={() => {
              sessionStorage.removeItem('active_session');
              logout();
              navigate('/login');
            }}
            title="Cerrar Sesión"
            className="w-9 h-9 rounded flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-500/10 shadow-xs transition-colors mb-2 p-0"
          >
            <LogOut size={17} />
          </button>
        </div>
      )}

      {/* ── EXPANDED: full sidebar content ── */}
      {sidebarOpen && (
        <div className="w-[320px] h-full flex flex-col overflow-hidden rounded-[12px]">
          {/* User Info + Logout */}
          <div className="px-4 py-3 bg-[#f9f9f9] dark:bg-[#111112] flex items-center gap-3 shadow-xs">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#262626] to-[#141414] flex items-center justify-center font-black text-white text-sm shadow-md">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10b981] border-2 border-[var(--bg-sidebar-header)] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            </div>
            {/* Name & Role & City */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">{userName}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono flex items-center gap-1 truncate font-medium">
                <span>{userRole}</span>
                {user?.ciudad && (
                  <>
                    <span className="text-[var(--text-muted)]">•</span>
                  </>
                )}
              </div>
            </div>
            {/* Theme Toggle (Icon only) */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a Tema Claro' : 'Cambiar a Tema Oscuro'}
              className="w-8 h-8 rounded flex items-center justify-center bg-[#efefef] dark:bg-[#272727] hover:bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-xs hover:shadow-sm transition-all duration-200 flex-shrink-0 cursor-pointer p-0"
            >
              {theme === 'dark' ? <Sun size={15} className="text-amber-500" /> : <Moon size={15} className="text-indigo-500" />}
            </button>
            {/* Logout Button (High-Contrast Red) */}
            <button
              onClick={() => {
                sessionStorage.removeItem('active_session');
                logout();
                navigate('/login');
              }}
              title="Cerrar Sesión"
              className=" w-8 h-8 flex items-center gap-1.5 bg-[#efefef] dark:bg-[#272727] hover:bg-red-600 text-red-600 dark:text-red-300 hover:text-white shadow-sm hover:shadow px-2.5 py-1.5 rounded text-[11px] font-bold transition-all duration-200 flex-shrink-0 cursor-pointer"
            >
              <LogOut size={13} />
            </button>
          </div>

          <div className="w-full h-px bg-neutral-200 dark:bg-[#343434]" />

          {/* Header con Central de Despacho y Heatmap directamente abajo */}
          <div className="p-4 bg-[#f9f9f9] dark:bg-[#111112] shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleDispatchClick}
                className="flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--brand)] font-black uppercase tracking-wider text-sm text-left transition-colors cursor-pointer"
              >
                <Map size={18} className="text-[var(--brand)]" /> Central de Despacho
              </button>
            </div>

            {/* Botón de Heatmap (Floating Shadow Action) */}
            <button
              onClick={toggleHeatmap}
              className={`flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded text-xs font-bold transition-all cursor-pointer ${
                heatmapEnabled
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-[#efefef] dark:bg-[#181819] hover:bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-sm hover:shadow-md'
              }`}
            >
              <Layers size={14} className={heatmapEnabled ? 'text-white' : 'text-[var(--text-secondary)]'} />
              <span>{heatmapEnabled ? 'Heatmap: Activado' : 'Activar Análisis Heatmap'}</span>
            </button>
          </div>

          <div className="w-full h-px bg-neutral-200 dark:bg-[#343434]" />

          {/* Filtro por Tipo */}
          {(() => {
            const TYPE_OPTIONS = [
              { key: 'all',       label: 'Todos los Tipos', Icon: LayoutList,   iconColor: 'text-[var(--text-secondary)]' },
              { key: 'robo',      label: 'Robo',            Icon: Crosshair,    iconColor: 'text-amber-500' },
              { key: 'homicidio', label: 'Homicidio',       Icon: Skull,        iconColor: 'text-red-500' },
              { key: 'accidente', label: 'Accidente',       Icon: Car,          iconColor: 'text-orange-500' },
              { key: 'atentado',  label: 'Atentado',        Icon: Bomb,         iconColor: 'text-rose-600' },
            ] as const;
            const selected = TYPE_OPTIONS.find(o => o.key === filterType) ?? TYPE_OPTIONS[0];
            return (
              <div className="px-4 py-3 bg-[#f9f9f9] dark:bg-[#111112] flex flex-col gap-2">
                <div className="relative">
                  <button
                    onClick={() => setTypeDropdownOpen(v => !v)}
                    className="w-full flex items-center gap-2 bg-[#efefef] dark:bg-[#181819] shadow-sm hover:shadow rounded px-3 py-2 text-sm text-[var(--text-primary)] font-semibold transition-all duration-150 outline-none cursor-pointer"
                  >
                    <selected.Icon size={14} className={selected.iconColor} />
                    <span className="flex-1 text-left text-[13px]">{selected.label}</span>
                    <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform duration-200 ${typeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {typeDropdownOpen && (
                    <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-[var(--bg-sidebar)] rounded shadow-md overflow-hidden py-1">
                      {TYPE_OPTIONS.map(({ key, label, Icon, iconColor }) => (
                        <button
                          key={key}
                          onClick={() => { setFilters({ type: key }); setTypeDropdownOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors cursor-pointer ${
                            filterType === key
                              ? 'bg-[var(--accent-bg)] text-[var(--text-primary)] font-bold'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <Icon size={14} className={iconColor} />
                          <span className="font-medium">{label}</span>
                          {filterType === key && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--brand)] shadow-[0_0_6px_var(--brand)]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="w-full h-px bg-neutral-200 dark:bg-[#343434]" />

          {/* Lista de Eventos Virtualizada */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-[#f9f9f9] dark:bg-[#111112]">
            <h3 className="text-xs uppercase text-[var(--text-primary)] font-extrabold mb-1 flex items-center gap-2 tracking-wider">
              <Activity size={14} className="text-[var(--brand)]" /> {`Emergencias Activas (${activeCount})`}
            </h3>

            {sortedAlerts.map(alert => {
              const minsWaiting = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 60000);
              const isOverdue = minsWaiting > 5;
              const alertType = getAlertType(alert);
              const TYPE_META = {
                robo:      { Icon: Crosshair, label: 'Robo',      color: 'text-amber-900 bg-amber-500 dark:text-[#fcd34d] dark:bg-[#78350f]/35 font-bold shadow-xs' },
                homicidio: { Icon: Skull,     label: 'Homicidio', color: 'text-red-900 bg-red-500 dark:text-[#fca5a5] dark:bg-[#7f1d1d]/35 font-bold shadow-xs' },
                accidente: { Icon: Car,       label: 'Accidente', color: 'text-orange-950 bg-orange-500 dark:text-[#fdba74] dark:bg-[#7c2d12]/35 font-bold shadow-xs' },
                atentado:  { Icon: Bomb,      label: 'Atentado',  color: 'text-rose-950 bg-rose-500 dark:text-[#f87171] dark:bg-[#450a0a]/55 font-black shadow-xs' },
              } as const;
              const meta = TYPE_META[alertType as keyof typeof TYPE_META] ?? TYPE_META.robo;
              const TypeIcon = meta.Icon;
              const isFocused = focusedAlertId === alert.id;

              return (
                <div
                  key={alert.id}
                  onClick={() => handleAlertCardClick(alert.id)}
                  className={`rounded flex flex-col cursor-pointer transition-all duration-200 overflow-hidden relative
                    ${isFocused 
                      ? 'bg-[#efefef] dark:bg-[#181819] shadow-md scale-[1.01]' 
                      : 'bg-[#efefef] dark:bg-[#181819] shadow-xs hover:shadow-sm hover:scale-[1.01] hover:bg-[#ece9e6] dark:hover:bg-[var(--bg-elevated)]'
                    }
                    ${isOverdue ? 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3.5px] before:bg-red-500' : ''}`}
                >
                  {/* ── Always visible: minimal info ─────────────── */}
                  <div className="px-3.5 py-3 flex flex-col gap-1.5">
                    {/* Row 1: type badge + SLA */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${meta.color}`}>
                        <TypeIcon size={10} /> {meta.label}
                      </span>
                      {isOverdue && (
                        <span className="text-[9px] bg-red-500 text-white dark:bg-[#881337]/50 dark:text-[#fda4af] font-black px-1.5 py-0.5 rounded shadow-xs tracking-wider flex-shrink-0">
                          SLA VENCIDO
                        </span>
                      )}
                    </div>
                    {/* Row 2: address */}
                    <div className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                      <MapPin size={11} className="flex-shrink-0 text-[var(--text-muted)]" />
                      <span className="truncate">{formatAddress(alert.sourceLocation)}</span>
                    </div>
                    {/* Row 3: time + status */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold flex items-center gap-1">
                        <Clock size={10} />
                        {minsWaiting < 60
                          ? `${minsWaiting}m`
                          : `${Math.floor(minsWaiting / 60)}h ${minsWaiting % 60}m`}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs ${
                        alert.status === 'pending'   ? 'text-white bg-red-500 dark:text-white dark:bg-zinc-800 font-black' :
                        alert.status === 'reviewing' ? 'text-white bg-amber-500 dark:text-zinc-300 dark:bg-zinc-900 font-bold' :
                        alert.status === 'verified'  ? 'text-white bg-sky-500 dark:text-zinc-200 dark:bg-zinc-800 font-semibold' :
                        alert.status === 'resolved'  ? 'text-white bg-emerald-500 dark:text-zinc-500 dark:bg-black line-through' :
                        'text-[var(--brand)] bg-[var(--bg-elevated)]'
                      }`}>{alert.status}</span>
                    </div>
                  </div>

                  {/* ── Expanded: full details (only when focused) ─ */}
                  {isFocused && (
                    <div className="px-3.5 pb-3.5 flex flex-col gap-2 pt-2 animate-in slide-in-from-top-1 duration-150">
                      {/* Description */}
                      <div className="text-xs text-[var(--text-primary)] font-semibold leading-snug">{alert.description}</div>
                      {/* Alert ID */}
                      <div className="text-[10px] font-mono text-[var(--text-muted)]">ID: {alert.id.split('-')[0]}...</div>
                      {/* User */}
                      <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                        <span className="text-[var(--text-secondary)] font-medium">Ciudadano:</span> {alert.userId}
                      </div>
                      {/* Timestamp */}
                      <div className="text-[10px] text-[var(--text-muted)]">
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
                <div className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--bg-elevated)] p-3 rounded shadow-sm flex flex-col gap-1">
                  <span className="text-emerald-500 font-bold">&gt; Zona Nacional Despejada</span>
                  <span className="text-[var(--text-muted)]">&gt; Escuchando frecuencia principal...</span>
                </div>
              </div>
            )}
          </div>

          {/* Admin Navigation Menu */}
          <div className="w-full h-px bg-neutral-200 dark:bg-[#343434]" />
          <AdminMenu />
        </div>
      )}
    </aside>
  );
};
