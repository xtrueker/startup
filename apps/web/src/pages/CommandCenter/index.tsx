import React, { useEffect, useState, useMemo } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useCommandStore } from '../../stores/useCommandStore';
import { TacticalMap } from '../../components/CommandCenter/TacticalMap';
import { AudioStreamer } from '../../components/CommandCenter/AudioStreamer';
import { AlertWizardSidebar } from '../../components/CommandCenter/AlertWizardSidebar';
import { Activity, Layers, ShieldAlert, Filter, Clock, Play, Pause, AlertTriangle, X, LogOut, ChevronDown, Crosshair, Skull, Car, Bomb, LayoutList, MapPin } from 'lucide-react';
import { authService } from '../../services/auth';

import { cameraService } from '../../services/cameras';
import { alertService } from '../../services/alerts';

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const CommandCenter: React.FC = () => {
  const { socket, connected } = useSocket({ namespace: '/operators' });
  
  // Zustand actions & state
  const { 
    activeAlerts, injectAlert, resolveAlert, toggleHeatmap, heatmapEnabled, 
    pushAudioChunk, setFilters, filterType,
    isReplayMode, setReplayMode,
    focusedAlertId, focusMapOnAlert, updateAlertStatus,
    ghostVictims, predictiveCameras, selectedCamera, setSelectedCamera,
    systemCameras
  } = useCommandStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  // ── Fetch Initial State ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [alerts, cameras] = await Promise.all([
          alertService.getAlerts(),
          cameraService.getCameras()
        ]);
        
        if (alerts) {
          alerts.forEach((alert) => {
            injectAlert({
              id: alert.id.toString(),
              timestamp: alert.createdAt || new Date().toISOString(),
              sourceLocation: { 
                lat: alert.location?.latitude || 0, 
                lng: alert.location?.longitude || 0,
                address: alert.location?.address || ''
              },
              status: alert.status as any,
              userId: (alert as any).userId || 'citizen_unknown',
              description: alert.type || 'Pánico Disparado',
            });
          });
        }

        if (cameras) {
           useCommandStore.getState().setSystemCameras(cameras.map((c: any) => ({
             id: c.id,
             name: c.name || `Cámara ${c.id.substring(0,4)}`,
             lat: c.location?.latitude || 0,
             lng: c.location?.longitude || 0,
             rtspUrl: c.streamUrl
           })));
        }
      } catch (err) {
        console.error('Error cargando estado inicial del Command Center:', err);
      }
    };
    
    fetchInitialData();
  }, [injectAlert]);

  // ── Socket Events -> Zustand Dispatcher ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('alert:new', (alertData) => {
      let lat = 0;
      let lng = 0;
      if (alertData.location && alertData.location.latitude !== undefined) {
        lat = alertData.location.latitude;
        lng = alertData.location.longitude;
      } else if (alertData.latitude !== undefined) {
        lat = alertData.latitude;
        lng = alertData.longitude;
      }

      injectAlert({
        id: (alertData.id || alertData._id || '').toString(),
        timestamp: alertData.createdAt || new Date().toISOString(),
        sourceLocation: { 
          lat: lat, 
          lng: lng,
          address: alertData.location?.address || alertData.address || ''
        },
        status: alertData.status || 'pending',
        userId: alertData.userId || 'citizen_unknown',
        description: alertData.type || 'Emergencia',
      });
      console.log('🚨 [Store] Inyectada nueva alerta táctica');
    });

    socket.on('camera:new', (camData: any) => {
      const currentCameras = useCommandStore.getState().systemCameras;
      if (!currentCameras.find(c => c.id === camData.id)) {
        useCommandStore.getState().setSystemCameras([...currentCameras, {
          id: camData.id,
          name: camData.name,
          lat: camData.location.latitude,
          lng: camData.location.longitude,
          rtspUrl: camData.streamUrl
        }]);
      }
    });

    socket.on('alert:deleted', ({ id }) => resolveAlert(id.toString()));
    socket.on('alert:cancelled', ({ id }) => resolveAlert(id.toString()));
    socket.on('alert:updated', ({ id, status }) => {
      updateAlertStatus(id.toString(), status);
    });

    socket.on('evidence:audio_chunk', ({ alertId, url }) => {
      pushAudioChunk(alertId.toString(), url);
    });

    // ─── GHOST MODE LISTENERS ────────────────────────────────────────────────
    socket.on('ghost:live_tracking', ({ userId, lat, lng, timestamp }) => {
      useCommandStore.getState().updateGhostLocation({ userId, lat, lng, timestamp });
    });

    socket.on('ghost:nearby_cameras', ({ cameras }) => {
      useCommandStore.getState().setPredictiveCameras(cameras);
    });

    return () => {
      socket.off('alert:new');
      socket.off('alert:deleted');
      socket.off('alert:cancelled');
      socket.off('alert:updated');
      socket.off('evidence:audio_chunk');
      socket.off('ghost:live_tracking');
      socket.off('ghost:nearby_cameras');
    };
  }, [socket, injectAlert, resolveAlert, pushAudioChunk]);

  // Derive KPIs & SLA Ordering
  const activeCount = Object.keys(activeAlerts).length;

  // Normalize alert type from description field
  const getAlertType = (alert: { description?: string; type?: string }): string => {
    const raw = (alert.description || alert.type || '').toLowerCase();
    if (raw.includes('homicidio') || raw.includes('asesinato') || raw.includes('muerte')) return 'homicidio';
    if (raw.includes('atentado') || raw.includes('explosivo') || raw.includes('bomba') || raw.includes('terrorismo')) return 'atentado';
    if (raw.includes('accidente') || raw.includes('choque') || raw.includes('colision') || raw.includes('colisión')) return 'accidente';
    if (raw.includes('robo') || raw.includes('hurto') || raw.includes('asalto')) return 'robo';
    return 'robo'; // default
  };

  // Priority weight per type
  const TYPE_PRIORITY: Record<string, number> = { atentado: 100, homicidio: 80, robo: 50, accidente: 30 };

  // Format address: show readable coords when no real address is available
  const GENERIC_ADDRESSES = ['coordenadas provistas', 'ubicación gps', 'ubicacion gps', 'gps', ''];
  const formatAddress = (loc: { address?: string; lat: number; lng: number }): string => {
    const addr = (loc.address || '').trim();
    if (GENERIC_ADDRESSES.includes(addr.toLowerCase())) {
      if (loc.lat === 0 && loc.lng === 0) return 'Sin ubicación';
      return `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
    }
    return addr;
  };

  // Sort alerts by Priority SLA
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

  const nearbyCameras = useMemo(() => {
    if (!focusedAlertId || !activeAlerts[focusedAlertId] || !systemCameras) return [];
    const alert = activeAlerts[focusedAlertId];
    const alertLat = alert.sourceLocation.lat;
    const alertLng = alert.sourceLocation.lng;
    return systemCameras.filter(cam => {
      const distance = getHaversineDistance(alertLat, alertLng, cam.lat, cam.lng);
      return distance <= 100;
    });
  }, [focusedAlertId, activeAlerts, systemCameras]);

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] overflow-hidden font-sans text-[#f5f5f5]">
      
      {/* ── Sidebar Izquierdo: Controles Críticos ─────────────────────── */}
      <aside className="w-80 bg-[#0a0a0a] border-r border-[#262626] flex flex-col z-20 shadow-2xl">
        {/* User Info + Logout */}
        <div className="px-4 py-3 border-b border-[#262626] bg-[#121212] flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#262626] to-[#141414] flex items-center justify-center font-black text-white text-sm shadow-md border border-[#333333]">
              {(authService.getRole() || 'A').charAt(0).toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10b981] border-2 border-[#121212] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          </div>
          {/* Name & Role */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#efede3] truncate">Operador Táctico</div>
            <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wider font-mono">{authService.getRole() || 'ADMIN'}</div>
          </div>
          {/* Logout Button */}
          <button
            onClick={() => { sessionStorage.removeItem('active_session'); authService.logout(); window.location.href = '/login'; }}
            title="Cerrar Sesión"
            className="flex items-center gap-1.5 bg-[#4c0519]/25 hover:bg-[#881337]/35 text-[#fda4af] hover:text-white border border-[#881337]/40 hover:border-[#e11d48]/50 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 flex-shrink-0"
          >
            <LogOut size={13} />
            <span>Salir</span>
          </button>
        </div>

        {/* Header */}
        <div className="p-5 border-b border-[#262626] bg-[#121212]/90 backdrop-blur flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#efede3] font-black uppercase tracking-widest text-sm">
            <ShieldAlert size={18} /> Central de Despacho
          </div>
          <div className={`text-xs px-2.5 py-1.5 rounded-md font-bold inline-flex items-center gap-1.5 shadow-sm w-max ${connected ? 'bg-[#064e3b]/30 text-[#6ee7b7] border border-[#065f46]/40' : 'bg-[#4c0519]/30 text-[#fda4af] border border-[#881337]/40 animate-pulse'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-[#f43f5e]'}`}></span>
            {connected ? 'En Vivo (0ms lag)' : 'Reconectando Canales...'}
          </div>
        </div>

        {/* Filtro por Tipo */}
        {(() => {
          const TYPE_OPTIONS = [
            { key: 'all',       label: 'Todos los Tipos', Icon: LayoutList,   iconColor: 'text-slate-400' },
            { key: 'robo',      label: 'Robo',            Icon: Crosshair,    iconColor: 'text-zinc-300' },
            { key: 'homicidio', label: 'Homicidio',       Icon: Skull,        iconColor: 'text-zinc-300'  },
            { key: 'accidente', label: 'Accidente',       Icon: Car,          iconColor: 'text-zinc-300'},
            { key: 'atentado',  label: 'Atentado',        Icon: Bomb,         iconColor: 'text-white'   },
          ] as const;
          const selected = TYPE_OPTIONS.find(o => o.key === filterType) ?? TYPE_OPTIONS[0];
          return (
            <div className="px-4 py-3 bg-[#121212]/50 backdrop-blur border-b border-[#262626] flex flex-col gap-2">
              <h3 className="text-[10px] uppercase text-[#737373] font-bold flex items-center gap-1.5 tracking-wider">
                <Filter size={11} className="text-[#818cf8]" /> Filtrar por Tipo
              </h3>
              <div className="relative">
                {/* Trigger */}
                <button
                  onClick={() => setTypeDropdownOpen(v => !v)}
                  className="w-full flex items-center gap-2 bg-[#141414] border border-[#262626] hover:border-[#383838] focus:border-[#6366f1] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] transition-all duration-150 outline-none"
                >
                  <selected.Icon size={14} className={selected.iconColor} />
                  <span className="flex-1 text-left text-[13px] font-medium">{selected.label}</span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${typeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown panel */}
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
               onClick={() => focusMapOnAlert(isFocused ? null : alert.id)}
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
           )})}
           
           {activeCount === 0 && (
             <div className="p-5 flex flex-col gap-4">
                <div className="text-xs text-slate-400 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-inner flex flex-col gap-1">
                   <span className="text-emerald-400">{`> Zona Nacional Despejada`}</span>
                   <span className="text-[#737373]">{`> Escuchando frecuencia principal...`}</span>
                </div>
             </div>
           )}
        </div>

        {/* Tactical Toolbar */}
        <div className="p-4 border-t border-[#262626] bg-[#121212] flex flex-col gap-2">
           <button 
             onClick={toggleHeatmap}
             className={`flex items-center justify-center gap-2 w-full py-2 rounded text-sm font-bold transition-all ${heatmapEnabled ? 'bg-[#242424] text-[#efede3] font-bold border border-[#404040]' : 'bg-[#171717] text-[#d4d4d4] border border-[#262626] hover:bg-[#202020] hover:text-white'}`}
           >
             <Layers size={16} /> 
             {heatmapEnabled ? 'Modo Predictivo (ON)' : 'Análisis Heatmap'}
           </button>
        </div>
      </aside>

      {/* ── Área Principal: Tactical Map ──────────────────────────────── */}
      <main className="flex-1 relative bg-[#0a0a0a]" style={{ minHeight: 0 }}>
        {/* KPI Bar */}
        <div className="absolute top-6 left-6 right-6 z-10 flex gap-4 pointer-events-none">
           <div className="glass-panel p-4 rounded-xl flex items-center gap-4 pointer-events-auto">
             <div className="bg-[#881337]/30 border border-[#9f1239]/40 p-2 rounded-lg">
               <AlertTriangle className="text-[#fb7185]" size={24} />
             </div>
             <div>
               <div className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">Alertas Activas</div>
               <div className="text-2xl font-black text-[#efede3] tabular-nums">{activeCount ?? '0'}</div>
             </div>
           </div>

        </div>

        <TacticalMap />

        {/* Nearby Cameras Collage Panel */}
        {focusedAlertId && activeAlerts[focusedAlertId] && (
          <div className="absolute bottom-6 left-6 right-[26rem] z-30 glass-panel p-4 rounded-xl flex flex-col gap-3 pointer-events-auto animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <div className="text-xs uppercase text-[#efede3] font-bold tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-pulse"></span>
                Cámaras de Seguridad Cercanas (Radio 100m)
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {nearbyCameras.length} {nearbyCameras.length === 1 ? 'cámara detectada' : 'cámaras detectadas'}
              </div>
            </div>
            
            {nearbyCameras.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-1 max-h-[160px] custom-scrollbar">
                {nearbyCameras.map(cam => {
                  const streamUrl = cam.rtspUrl || (cam as any).streamUrl;
                  return (
                    <div 
                      key={cam.id} 
                      onClick={() => setSelectedCamera(cam)}
                      className="min-w-[200px] max-w-[240px] aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex flex-col relative group hover:border-white transition-colors cursor-pointer"
                    >
                      <div className="absolute top-1.5 right-1.5 bg-slate-900/80 backdrop-blur px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-slate-300 shadow z-10 flex items-center gap-1">
                        {streamUrl ? (
                          <>
                            <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span>
                            LIVE
                          </>
                        ) : (
                          <>
                            <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                            OFFLINE
                          </>
                        )}
                      </div>
                      <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
                        {streamUrl ? (
                          <iframe
                            src={streamUrl}
                            title={cam.name}
                            className="w-full h-full border-0 pointer-events-none"
                            allowFullScreen
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-600 p-2 text-center select-none">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-[#737373]">Sin Señal</span>
                            <span className="text-[8px] font-mono max-w-xs truncate">{cam.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-1.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-300">
                        <span className="font-bold truncate max-w-[120px]">{cam.name}</span>
                        <span className="font-mono text-[8px] text-[#737373]">
                          {getHaversineDistance(
                            activeAlerts[focusedAlertId].sourceLocation.lat,
                            activeAlerts[focusedAlertId].sourceLocation.lng,
                            cam.lat,
                            cam.lng
                          ).toFixed(0)}m
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCamera(cam);
                        }}
                        className="w-full bg-[#1c1c1c] hover:bg-[#262626] text-[#efede3] text-[10px] py-1 font-semibold transition-colors border-t border-[#2e2e2e]"
                      >
                        ABRIR VIDEO FEED
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[#737373] bg-slate-950/40 rounded-lg border border-slate-800/50">
                No se encontraron cámaras de seguridad en un radio de 100 metros.
              </div>
            )}
          </div>
        )}

        {/* Historical Replay Slider */}
        {!focusedAlertId && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-2xl pointer-events-auto">
            <div className="bg-slate-900/90 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-[#efede3] flex items-center gap-2">
                  <Clock size={16} className="text-[#818cf8]" />
                  Máquina del Tiempo (Replay Histórico)
                </div>
                <button 
                  onClick={() => setReplayMode(!isReplayMode)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${isReplayMode ? 'bg-indigo-600/20 text-[#818cf8] border-indigo-500/50 hover:bg-indigo-600/30' : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
                >
                  {isReplayMode ? 'Cerrar Replay' : 'Activar Replay'}
                </button>
              </div>
              
              {isReplayMode && (
                <div className="flex items-center gap-4 mt-2">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full p-2 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/30"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <div className="flex-1 relative flex items-center">
                    <div className="absolute left-0 right-0 h-1 bg-slate-800 rounded overflow-hidden">
                       <div className="absolute left-0 top-0 bottom-0 bg-indigo-500 w-1/3"></div>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      defaultValue="33"
                      className="w-full absolute z-10 opacity-0 cursor-pointer"
                    />
                    {/* Custom Thumb */}
                    <div className="w-3 h-3 bg-white rounded-full absolute z-20 left-1/3 -ml-1.5 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                  </div>
                  <div className="text-xs font-mono text-slate-400 tabular-nums w-20 text-right bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    -02:15:00
                  </div>
                </div>
              )}
            </div>
          </div>
        )}



        {/* ─── GHOST MODE UI: INTERCEPTION BANNER & CAMERA GRID ─── */}
        {Object.keys(ghostVictims || {}).length > 0 && (
          <div className="absolute top-20 left-80 right-0 bottom-0 pointer-events-none flex flex-col z-50 p-6 animate-in slide-in-from-top-4">
            {/* Massive Red Banner */}
            <div className="w-full bg-rose-600/90 backdrop-blur-md border-b-4 border-rose-900 text-white p-4 shadow-[0_10px_50px_rgba(225,29,72,0.5)] flex items-center justify-between rounded-xl pointer-events-auto">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full animate-pulse">
                  <ShieldAlert size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-widest text-white shadow-sm">
                    Modo Fantasma Detonado
                  </h1>
                  <p className="text-rose-100 font-medium">Interceptando ruta mediante motor predictivo de cámaras...</p>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <div className="bg-black/30 px-4 py-2 rounded-lg text-center border border-rose-500/50">
                  <div className="text-[10px] uppercase text-rose-200 font-bold">Cámaras Armadas</div>
                  <div className="text-2xl font-black">{predictiveCameras?.length || 0}</div>
                </div>
                <button 
                  onClick={() => {
                    const victimIds = Object.keys(useCommandStore.getState().ghostVictims);
                    victimIds.forEach(id => useCommandStore.getState().clearGhostData(id));
                  }}
                  className="bg-black/40 hover:bg-black/60 text-white font-bold py-2 px-4 rounded border border-rose-400/50 transition-colors"
                >
                  ABORTAR INTERCEPCIÓN
                </button>
              </div>
            </div>

            {/* Predictive Cameras Grid */}
            <div className="flex-1 mt-6 flex gap-4 overflow-x-auto pointer-events-auto pb-6 custom-scrollbar">
              {predictiveCameras?.map(cam => (
                <div key={cam.id} className="min-w-[320px] max-w-[400px] h-full max-h-[250px] bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col relative group">
                   <div className="absolute top-2 right-2 bg-rose-600 px-2 py-1 rounded text-[10px] font-black uppercase text-white shadow-lg animate-pulse z-10 flex items-center gap-1">
                     <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
                   </div>
                   <div className="flex-1 bg-black flex items-center justify-center relative">
                     {/* Placeholder for Video Feed */}
                     <div className="absolute inset-0 bg-slate-800 animate-pulse"></div>
                     <span className="z-10 text-[#737373] font-mono text-xs">Conectando RTSP...<br/>{cam.rtspUrl}</span>
                   </div>
                   <div className="p-3 bg-slate-950 border-t border-slate-800">
                     <div className="text-sm font-bold text-white truncate">{cam.name}</div>
                     <div className="text-xs text-slate-400 font-mono flex gap-2">
                       <span>{cam.lat.toFixed(4)}</span>
                       <span>{cam.lng.toFixed(4)}</span>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}



        {/* Wizard Sidebar (Right) */}
        {focusedAlertId && activeAlerts[focusedAlertId] && (
          <div className="absolute top-0 right-0 bottom-0 z-40">
            <AlertWizardSidebar 
              alert={activeAlerts[focusedAlertId]} 
              onClose={() => focusMapOnAlert(null)} 
            />
          </div>
        )}

        {/* selected camera streaming preview (FULL MODAL) */}
        {selectedCamera && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[800px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 fade-in duration-200">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <div>
                  <h3 className="font-black text-white flex items-center gap-2 text-lg uppercase tracking-wider">
                    <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></span>
                    🔴 EN VIVO - {selectedCamera.name}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">TÁCTICA ID: {selectedCamera.id.substring(0, 12)}...</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCamera(null);
                  }}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors border border-transparent hover:border-slate-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="aspect-video bg-black relative flex items-center justify-center">
                {selectedCamera.rtspUrl ? (
                  <iframe
                    src={selectedCamera.rtspUrl}
                    title={selectedCamera.name}
                    className="w-full h-full border-0 pointer-events-none"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-[#737373]">
                    <span className="animate-pulse text-lg font-mono text-red-500">❌ SEÑAL PERDIDA / CONECTANDO RTSP...</span>
                    <span className="text-sm text-slate-600 font-mono">Stream URL: {selectedCamera.rtspUrl || 'N/A'}</span>
                  </div>
                )}
                {/* Fake HUD overlay for dramatic effect */}
                <div className="absolute inset-0 pointer-events-none border-[4px] border-slate-800/30">
                  <div className="absolute top-4 left-4 text-emerald-500 font-mono text-xs font-bold drop-shadow-md">REC</div>
                  <div className="absolute top-4 right-4 text-white font-mono text-xs drop-shadow-md">{new Date().toLocaleTimeString()}</div>
                  <div className="absolute bottom-4 left-4 text-white font-mono text-xs drop-shadow-md">CAM_LAT: {selectedCamera.lat.toFixed(6)}</div>
                  <div className="absolute bottom-4 right-4 text-white font-mono text-xs drop-shadow-md">CAM_LNG: {selectedCamera.lng.toFixed(6)}</div>
                </div>
              </div>
  
              <div className="p-4 bg-slate-950 text-sm flex justify-between text-slate-400">
                <span className="font-mono">Coordenadas: {selectedCamera.lat.toFixed(6)}, {selectedCamera.lng.toFixed(6)}</span>
                <span className="text-emerald-400 uppercase font-black tracking-widest text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Conexión Segura
                </span>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default CommandCenter;
