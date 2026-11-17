import React, { useEffect, useMemo } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useCommandStore } from '../../stores/useCommandStore';
import { TacticalMap } from '../../components/CommandCenter/TacticalMap';
import { AlertWizardSidebar } from '../../components/CommandCenter/AlertWizardSidebar';
import { PoliceSirenBorders } from '../../components/CommandCenter/PoliceSirenBorders';
import { 
  ShieldAlert, AlertTriangle, X, Cctv
} from 'lucide-react';
import {
  PrismEmblem,
  StatusPill,
  TelemetryEqualizer,
} from '../../components/ui/LiquidPrimitives';
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
  const { socket } = useSocket({ namespace: '/operators' });
  
  // Zustand actions & state
  const { 
    activeAlerts, injectAlert, resolveAlert, 
    pushAudioChunk,
    focusedAlertId, focusMapOnAlert, updateAlertStatus,
    ghostVictims, predictiveCameras, selectedCamera, setSelectedCamera,
    systemCameras, sidebarOpen
  } = useCommandStore();

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
    <div className="flex h-full w-full bg-[var(--bg-app)] overflow-hidden font-sans text-[var(--text-primary)] theme-transition">
      {/* ── Área Principal: Tactical Map ──────────────────────────────── */}
      <main className="flex-1 relative bg-[var(--bg-app)]" style={{ minHeight: 0 }}>
        {/* KPI & Telemetry Pill Bar (Sculpted Liquid Glass HUD) */}
        <div 
          className="absolute top-4 right-6 z-10 flex flex-wrap items-center gap-3 pointer-events-none"
          style={{ 
            left: sidebarOpen ? 344 : 92, 
            transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)' 
          }}
        >
           <div className="glass-panel px-4 py-2.5 rounded-[22px] flex items-center gap-3.5 pointer-events-auto">
             <div className="w-10 h-10 rounded-2xl bg-rose-500/12 border border-rose-500/25 text-[#E11D48] dark:text-rose-400 flex items-center justify-center">
               <AlertTriangle size={19} />
             </div>
             <div>
               <div className="text-[11px] text-[var(--text-secondary)] font-semibold tracking-tight">Alertas activas</div>
               <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums leading-tight">{activeCount ?? '0'}</div>
             </div>
           </div>

           <div className="glass-panel px-4 py-2.5 rounded-[22px] hidden md:flex items-center gap-3.5 pointer-events-auto">
             <PrismEmblem size={36} activeAlert={activeCount > 0} />
             <div className="flex flex-col gap-0.5 pr-1">
               <StatusPill
                 label={activeCount > 0 ? 'Respuesta activa en mapa' : 'Monitoreo estable'}
                 tone={activeCount > 0 ? 'crimson' : 'emerald'}
                 pulsing={activeCount > 0}
                 className="!py-0.5 !px-2.5 !text-[10.5px]"
               />
               <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] font-medium mt-0.5 pl-0.5">
                 <Cctv size={12} className="text-[#0EA5E9]" />
                 <span>{systemCameras.length} {systemCameras.length === 1 ? 'cámara en red' : 'cámaras en red'}</span>
                 <TelemetryEqualizer active={systemCameras.length > 0} />
               </div>
             </div>
           </div>
        </div>

        <TacticalMap />

        {/* Efecto Sirena Policial Neón (Bordes Superior, Derecho e Inferior) */}
        <PoliceSirenBorders active={activeCount > 0} />

        {/* Nearby Cameras Collage Panel */}
        {focusedAlertId && activeAlerts[focusedAlertId] && (
          <div 
            className="absolute bottom-6 right-[27rem] z-30 glass-panel p-4 rounded-[24px] flex flex-col gap-3 pointer-events-auto animate-in slide-in-from-bottom-4"
            style={{ 
              left: sidebarOpen ? 344 : 92, 
              transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)' 
            }}
          >
            <div className="flex justify-between items-center">
              <div className="text-xs text-[var(--text-primary)] font-bold tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0EA5E9] shadow-[0_0_8px_#0EA5E9] animate-pulse" />
                Cámaras de seguridad cercanas (Radio 100 m)
              </div>
              <div className="text-[11px] text-[var(--text-muted)] font-mono font-medium">
                {nearbyCameras.length} {nearbyCameras.length === 1 ? 'cámara detectada' : 'cámaras detectadas'}
              </div>
            </div>
            
            {nearbyCameras.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1 max-h-[168px] custom-scrollbar">
                {nearbyCameras.map(cam => {
                  const streamUrl = cam.rtspUrl || (cam as any).streamUrl;
                  return (
                    <div 
                      key={cam.id} 
                      onClick={() => setSelectedCamera(cam)}
                      className="min-w-[200px] max-w-[240px] aspect-video bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-[18px] overflow-hidden shadow-sm hover:shadow-md flex flex-col relative group transition-all cursor-pointer"
                    >
                      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded-full text-[9px] font-bold uppercase text-white z-10 flex items-center gap-1">
                        {streamUrl ? (
                          <>
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            LIVE
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                            OFFLINE
                          </>
                        )}
                      </div>
                      <div className="flex-1 bg-neutral-950 flex items-center justify-center relative overflow-hidden">
                        <div className="flex flex-col items-center gap-1 text-zinc-400 p-2 text-center select-none">
                          <span className="text-[10px] font-mono font-bold text-sky-400">STREAM CCTV</span>
                          <span className="text-[9px] font-mono max-w-[160px] truncate">{streamUrl || 'Sin señal'}</span>
                        </div>
                      </div>
                      <div className="px-2.5 py-1.5 bg-[var(--bg-elevated)] flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                        <span className="font-semibold truncate max-w-[120px] text-[var(--text-primary)]">{cam.name}</span>
                        <span className="font-mono text-[9px] text-[var(--text-muted)]">
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
                        className="w-full liquid-pill-obsidian rounded-none text-[10px] py-1.5 font-semibold transition-colors cursor-pointer"
                      >
                        Abrir video feed
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[var(--text-secondary)] bg-[var(--bg-input)] rounded-[16px] border border-[var(--border-subtle)]">
                No se encontraron cámaras de seguridad en un radio de 100 metros.
              </div>
            )}
          </div>
        )}

        {/* ─── GHOST MODE UI: INTERCEPTION BANNER & CAMERA GRID ─── */}
        {Object.keys(ghostVictims || {}).length > 0 && (
          <div 
            className="absolute top-20 right-0 bottom-0 pointer-events-none flex flex-col z-50 p-6 animate-in slide-in-from-top-4"
            style={{ 
              left: sidebarOpen ? 344 : 92, 
              transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)' 
            }}
          >
            <div className="w-full bg-[#E11D48]/90 backdrop-blur-xl border border-rose-300/40 text-white p-5 shadow-2xl flex items-center justify-between rounded-[24px] pointer-events-auto">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full animate-pulse">
                  <ShieldAlert size={28} />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    Modo Fantasma activado
                  </h1>
                  <p className="text-rose-100 text-xs font-medium">Interceptando ruta mediante motor predictivo de cámaras...</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <div className="bg-black/25 px-4 py-2 rounded-2xl text-center border border-white/20">
                  <div className="text-[10px] text-rose-100 font-semibold">Cámaras armadas</div>
                  <div className="text-xl font-bold">{predictiveCameras?.length || 0}</div>
                </div>
                <button 
                  onClick={() => {
                    const victimIds = Object.keys(useCommandStore.getState().ghostVictims);
                    victimIds.forEach(id => useCommandStore.getState().clearGhostData(id));
                  }}
                  className="bg-white text-[#BE123C] hover:bg-rose-50 font-bold py-2.5 px-5 rounded-full text-xs shadow-md transition-colors cursor-pointer"
                >
                  Abortar intercepción
                </button>
              </div>
            </div>

            {/* Predictive Cameras Grid */}
            <div className="flex-1 mt-5 flex gap-4 overflow-x-auto pointer-events-auto pb-6 custom-scrollbar">
              {predictiveCameras?.map(cam => (
                <div key={cam.id} className="min-w-[300px] max-w-[380px] h-full max-h-[240px] liquid-glass-strong rounded-[24px] overflow-hidden flex flex-col relative group">
                   <div className="absolute top-3 right-3 bg-[#E11D48] px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow animate-pulse z-10 flex items-center gap-1">
                     <span className="w-1.5 h-1.5 bg-white rounded-full" /> LIVE
                   </div>
                   <div className="flex-1 bg-neutral-950 flex items-center justify-center relative">
                     <span className="z-10 text-sky-400 font-mono text-xs text-center px-4">Conectando RTSP...<br/>{cam.rtspUrl}</span>
                   </div>
                   <div className="p-3.5 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)]">
                     <div className="text-sm font-bold text-[var(--text-primary)] truncate">{cam.name}</div>
                     <div className="text-xs text-[var(--text-muted)] font-mono flex gap-2 mt-0.5">
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-md pointer-events-auto p-4">
            <div className="liquid-glass-strong rounded-[28px] w-full max-w-[780px] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
              <div className="p-5 border-b border-[var(--border-subtle)] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#E11D48] animate-pulse" />
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-base tracking-tight">
                      En vivo • {selectedCamera.name}
                    </h3>
                    <span className="text-xs font-mono text-[var(--text-muted)]">ID: {selectedCamera.id.substring(0, 12)}...</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCamera(null);
                  }}
                  className="w-9 h-9 rounded-full glass-button flex items-center justify-center p-0"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="aspect-video bg-neutral-950 relative flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center p-6">
                  <span className="text-sm font-mono font-bold text-sky-400">STREAM CCTV ACTIVO</span>
                  <span className="text-xs text-zinc-400 font-mono bg-black/50 px-3 py-1 rounded-full border border-white/10">
                    {selectedCamera.rtspUrl || 'Sin URL configurada'}
                  </span>
                </div>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 text-emerald-400 font-mono text-xs font-bold">REC</div>
                  <div className="absolute top-4 right-4 text-white font-mono text-xs">{new Date().toLocaleTimeString()}</div>
                  <div className="absolute bottom-4 left-4 text-white/80 font-mono text-xs">LAT: {selectedCamera.lat.toFixed(6)}</div>
                  <div className="absolute bottom-4 right-4 text-white/80 font-mono text-xs">LNG: {selectedCamera.lng.toFixed(6)}</div>
                </div>
              </div>
  
              <div className="p-4 flex justify-between items-center text-xs text-[var(--text-secondary)]">
                <span className="font-mono">Coordenadas: {selectedCamera.lat.toFixed(6)}, {selectedCamera.lng.toFixed(6)}</span>
                <span className="text-[#0D9488] dark:text-emerald-400 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  Conexión segura
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
