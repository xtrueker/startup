import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { useCommandStore } from '../../stores/useCommandStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { AdminMenu } from './AdminMenu';
import { AudioStreamer } from './AudioStreamer';
import { PrismEmblem } from '../ui/LiquidPrimitives';
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
  LayoutGrid,
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
        width: sidebarOpen ? 320 : 66,
        height: 'calc(100% - 16px)',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}
      className="absolute top-[8px] left-[8px] bottom-[8px] z-30 liquid-glass-strong flex flex-col flex-shrink-0 rounded-[26px] pointer-events-auto"
    >
      {/* Pure-white top specular highlight */}
      <div className="pointer-events-none absolute top-0 left-[10%] right-[10%] h-[1.5px] bg-[var(--specular-rim)] opacity-90 z-20" />

      {/* ── Toggle button flotante en el borde ── */}
      <button
        onClick={() => setSidebarOpen(v => !v)}
        title={sidebarOpen ? 'Colapsar barra lateral' : 'Desplegar barra lateral'}
        className="absolute -right-4 top-7 z-50 w-8 h-8 rounded-full glass-button flex items-center justify-center p-0"
      >
        {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
      </button>

      {/* ── COLLAPSED: barra de iconos liquid glass ── */}
      {!sidebarOpen && (
        <div className="w-[66px] h-full flex flex-col items-center py-3.5 gap-2 overflow-y-auto overflow-x-hidden custom-scrollbar select-none rounded-[26px]">
          <div className="relative flex-shrink-0 my-0.5" title={`${userName} • ${userRole}`}>
            <PrismEmblem size={40} activeAlert={activeCount > 0} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-white dark:border-[#0F141C]" />
          </div>

          <div className="w-8 h-px bg-[var(--border-strong)] my-1 shrink-0" />

          <button
            onClick={handleDispatchClick}
            title="Central de Despacho (Mapa Táctico)"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all p-0 shrink-0 ${
              location.pathname === '/command-center'
                ? 'liquid-pill-obsidian'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Map size={17} />
          </button>

          <button
            onClick={toggleHeatmap}
            title={heatmapEnabled ? 'Heatmap: ACTIVADO' : 'Activar Heatmap'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all p-0 shrink-0 ${
              heatmapEnabled
                ? 'bg-[#0EA5E9] text-white shadow-pill-aqua'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Layers size={17} />
          </button>

          <div className="w-8 h-px bg-[var(--border-strong)] my-1 shrink-0" />

          <button
            onClick={() => navigate('/command-center/operators')}
            title="Módulo: Operadores"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all p-0 shrink-0 ${
              location.pathname === '/command-center/operators'
                ? 'liquid-pill-obsidian'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <UserCog size={17} />
          </button>

          <button
            onClick={() => navigate('/command-center/cameras')}
            title="Módulo: Cámaras de Seguridad"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all p-0 shrink-0 ${
              location.pathname === '/command-center/cameras'
                ? 'liquid-pill-obsidian'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Cctv size={17} />
          </button>

          <button
            onClick={() => navigate('/command-center/camera-grid')}
            title="Módulo: Cuadrícula 4x4 (Videowall)"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all p-0 shrink-0 ${
              location.pathname === '/command-center/camera-grid'
                ? 'liquid-pill-obsidian'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <LayoutGrid size={17} />
          </button>

          <button
            onClick={() => navigate('/command-center/teams')}
            title="Módulo: Equipos"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all p-0 shrink-0 ${
              location.pathname === '/command-center/teams'
                ? 'liquid-pill-obsidian'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Users size={17} />
          </button>

          <button
            onClick={() => navigate('/command-center/roles')}
            title="Módulo: Roles y Permisos"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all p-0 shrink-0 ${
              location.pathname === '/command-center/roles'
                ? 'liquid-pill-obsidian'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <ShieldCheck size={17} />
          </button>

          <button
            onClick={() => navigate('/command-center/emergencies')}
            title={`Módulo: Emergencias (${activeCount} activas)`}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all p-0 shrink-0 ${
              location.pathname === '/command-center/emergencies'
                ? 'liquid-pill-obsidian'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Siren size={17} />
            {activeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[16px] h-[16px] rounded-full bg-[#E11D48] text-[9px] font-bold text-white flex items-center justify-center shadow-xs">
                {activeCount}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/command-center/kpi')}
            title="Módulo: KPI & Reportes"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all p-0 shrink-0 ${
              location.pathname === '/command-center/kpi'
                ? 'liquid-pill-obsidian'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <BarChart3 size={17} />
          </button>

          <div className="flex-1 min-h-[8px]" />

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Cambiar a Tema Perla Claro' : 'Cambiar a Tema Obsidiana'}
            className="w-9 h-9 rounded-full glass-button flex items-center justify-center p-0 shrink-0"
          >
            {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-[#0EA5E9]" />}
          </button>

          <button
            onClick={() => {
              sessionStorage.removeItem('active_session');
              logout();
              navigate('/login');
            }}
            title="Cerrar Sesión"
            className="w-9 h-9 rounded-full bg-rose-500/12 hover:bg-[#E11D48] text-[#E11D48] hover:text-white border border-rose-500/30 flex items-center justify-center transition-colors mb-1 p-0 shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}

      {/* ── EXPANDED: full sidebar content ── */}
      {sidebarOpen && (
        <div className="w-[320px] h-full flex flex-col overflow-hidden rounded-[26px]">
          {/* User Info + Theme + Logout */}
          <div className="px-4 py-3.5 flex items-center gap-3 shrink-0">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-[var(--pill-primary-bg)] text-[var(--pill-primary-text)] flex items-center justify-center font-bold text-sm shadow-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white dark:border-[#0F141C]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-[var(--text-primary)] truncate tracking-tight">
                {userName}
              </div>
              <div className="text-[10.5px] text-[var(--text-muted)] uppercase tracking-wider font-mono flex items-center gap-1 truncate font-medium">
                <span>{userRole}</span>
                {user?.ciudad && <span>• {user.ciudad}</span>}
              </div>
            </div>

            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a Tema Perla Claro' : 'Cambiar a Tema Obsidiana'}
              className="w-8 h-8 rounded-full glass-button flex items-center justify-center flex-shrink-0 p-0"
            >
              {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-[#0EA5E9]" />}
            </button>

            <button
              onClick={() => {
                sessionStorage.removeItem('active_session');
                logout();
                navigate('/login');
              }}
              title="Cerrar Sesión"
              className="w-8 h-8 rounded-full bg-rose-500/12 hover:bg-[#E11D48] text-[#E11D48] hover:text-white border border-rose-500/30 flex items-center justify-center transition-all flex-shrink-0 p-0"
            >
              <LogOut size={13} />
            </button>
          </div>

          <div className="w-full h-px bg-[var(--border-subtle)] shrink-0" />

          {/* Header con Central de Despacho y Heatmap */}
          <div className="p-4 flex flex-col gap-3 shrink-0">
            <button
              onClick={handleDispatchClick}
              className="flex items-center gap-2.5 text-[var(--text-primary)] hover:text-[#0EA5E9] font-bold tracking-tight text-[15px] text-left transition-colors cursor-pointer"
            >
              <PrismEmblem size={30} activeAlert={activeCount > 0} />
              <span>Central de Despacho</span>
            </button>

            <button
              onClick={toggleHeatmap}
              className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                heatmapEnabled
                  ? 'bg-[#0EA5E9] text-white shadow-pill-aqua'
                  : 'glass-button'
              }`}
            >
              <Layers size={14} className={heatmapEnabled ? 'text-white' : 'text-[#0EA5E9]'} />
              <span>{heatmapEnabled ? 'Heatmap: Activado' : 'Activar análisis Heatmap'}</span>
            </button>
          </div>

          <div className="w-full h-px bg-[var(--border-subtle)] shrink-0" />

          {/* Filtro por Tipo */}
          {(() => {
            const TYPE_OPTIONS = [
              { key: 'all',       label: 'Todos los tipos', Icon: LayoutList,   iconColor: 'text-[var(--text-secondary)]' },
              { key: 'robo',      label: 'Robo',            Icon: Crosshair,    iconColor: 'text-amber-500' },
              { key: 'homicidio', label: 'Homicidio',       Icon: Skull,        iconColor: 'text-[#E11D48]' },
              { key: 'accidente', label: 'Accidente',       Icon: Car,          iconColor: 'text-orange-500' },
              { key: 'atentado',  label: 'Atentado',        Icon: Bomb,         iconColor: 'text-rose-600' },
            ] as const;
            const selected = TYPE_OPTIONS.find(o => o.key === filterType) ?? TYPE_OPTIONS[0];
            return (
              <div className="px-4 py-3 flex flex-col gap-2 shrink-0">
                <div className="relative">
                  <button
                    onClick={() => setTypeDropdownOpen(v => !v)}
                    className="w-full flex items-center gap-2.5 liquid-input-chamber rounded-full px-4 py-2 text-[13px] text-[var(--text-primary)] font-semibold transition-all outline-none cursor-pointer"
                  >
                    <selected.Icon size={14} className={selected.iconColor} />
                    <span className="flex-1 text-left">{selected.label}</span>
                    <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform duration-200 ${typeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {typeDropdownOpen && (
                    <div className="absolute top-full mt-2 left-0 right-0 z-50 liquid-glass-strong rounded-[20px] overflow-hidden p-1.5 flex flex-col gap-0.5">
                      {TYPE_OPTIONS.map(({ key, label, Icon, iconColor }) => (
                        <button
                          key={key}
                          onClick={() => { setFilters({ type: key }); setTypeDropdownOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[12.5px] transition-colors cursor-pointer ${
                            filterType === key
                              ? 'liquid-pill-obsidian font-semibold'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] font-medium'
                          }`}
                        >
                          <Icon size={14} className={filterType === key ? 'text-[#38BDF8]' : iconColor} />
                          <span>{label}</span>
                          {filterType === key && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0EA5E9]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="w-full h-px bg-[var(--border-subtle)] shrink-0" />

          {/* Lista de Emergencias Activas */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-2.5 custom-scrollbar">
            <h3 className="text-xs font-bold text-[var(--text-primary)] mb-0.5 flex items-center gap-2 tracking-tight shrink-0">
              <Activity size={14} className="text-[#0EA5E9]" />
              <span>Emergencias activas ({activeCount})</span>
            </h3>

            {sortedAlerts.map(alert => {
              const minsWaiting = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 60000);
              const isOverdue = minsWaiting > 5;
              const alertType = getAlertType(alert);
              const TYPE_META = {
                robo:      { Icon: Crosshair, label: 'Robo',      color: 'text-amber-700 bg-amber-500/15 border border-amber-500/25 dark:text-amber-300 font-semibold' },
                homicidio: { Icon: Skull,     label: 'Homicidio', color: 'text-rose-700 bg-rose-500/15 border border-rose-500/25 dark:text-rose-300 font-semibold' },
                accidente: { Icon: Car,       label: 'Accidente', color: 'text-orange-700 bg-orange-500/15 border border-orange-500/25 dark:text-orange-300 font-semibold' },
                atentado:  { Icon: Bomb,      label: 'Atentado',  color: 'text-rose-800 bg-rose-500/20 border border-rose-500/35 dark:text-rose-200 font-bold' },
              } as const;
              const meta = TYPE_META[alertType as keyof typeof TYPE_META] ?? TYPE_META.robo;
              const TypeIcon = meta.Icon;
              const isFocused = focusedAlertId === alert.id;

              return (
                <div
                  key={alert.id}
                  onClick={() => handleAlertCardClick(alert.id)}
                  className={`rounded-[20px] flex flex-col cursor-pointer transition-all duration-200 overflow-hidden relative shrink-0 border
                    ${isFocused 
                      ? 'bg-[var(--bg-elevated)] border-[#0EA5E9]/60 shadow-md scale-[1.01]' 
                      : 'bg-[var(--bg-input)] border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] hover:shadow-sm'
                    }
                    ${isOverdue ? 'before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3.5px] before:rounded-full before:bg-[#E11D48]' : ''}`}
                >
                  <div className="px-4 py-3 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full ${meta.color}`}>
                        <TypeIcon size={10} /> {meta.label}
                      </span>
                      {isOverdue && (
                        <span className="text-[9.5px] bg-rose-500/15 text-[#E11D48] dark:text-rose-300 border border-rose-500/30 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          SLA vencido
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[var(--text-primary)] font-medium flex items-center gap-1.5">
                      <MapPin size={12} className="flex-shrink-0 text-[#0EA5E9]" />
                      <span className="truncate">{formatAddress(alert.sourceLocation)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1">
                        <Clock size={11} />
                        {minsWaiting < 60
                          ? `${minsWaiting} min`
                          : `${Math.floor(minsWaiting / 60)}h ${minsWaiting % 60}m`}
                      </span>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        alert.status === 'pending'   ? 'text-white bg-[#E11D48]' :
                        alert.status === 'reviewing' ? 'text-amber-800 bg-amber-500/18 dark:text-amber-300' :
                        alert.status === 'verified'  ? 'text-sky-800 bg-sky-500/18 dark:text-sky-300' :
                        alert.status === 'resolved'  ? 'text-teal-800 bg-emerald-500/18 dark:text-emerald-300 line-through' :
                        'text-[var(--brand)] bg-[var(--accent-bg)]'
                      }`}>{alert.status}</span>
                    </div>
                  </div>

                  {isFocused && (
                    <div className="px-4 pb-3.5 flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)] animate-in slide-in-from-top-1 duration-150">
                      <div className="text-xs text-[var(--text-primary)] font-semibold leading-snug">{alert.description}</div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)]">ID: {alert.id.split('-')[0]}...</div>
                      <div className="text-[10.5px] text-[var(--text-muted)] flex items-center gap-1">
                        <span className="text-[var(--text-secondary)] font-medium">Ciudadano:</span> {alert.userId}
                      </div>
                      <div className="text-[10.5px] text-[var(--text-muted)]">
                        {new Date(alert.timestamp).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      </div>
                      <div className="mt-1">
                        <AudioStreamer alertId={alert.id} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {activeCount === 0 && (
              <div className="p-4 rounded-[20px] bg-[var(--bg-input)] border border-[var(--border-strong)] flex flex-col gap-1.5">
                <span className="text-xs text-[#0D9488] dark:text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  Zona nacional despejada
                </span>
                <span className="text-[11.5px] text-[var(--text-muted)]">
                  Escuchando frecuencia principal en tiempo real...
                </span>
              </div>
            )}
          </div>

          <div className="w-full h-px bg-[var(--border-subtle)] shrink-0" />
          <div className="shrink-0">
            <AdminMenu />
          </div>
        </div>
      )}
    </aside>
  );
};
