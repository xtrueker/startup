import React, { useEffect, useMemo } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useCommandStore } from '../../stores/useCommandStore';
import { TacticalMap } from '../../components/CommandCenter/TacticalMap';
import { AlertWizardSidebar } from '../../components/CommandCenter/AlertWizardSidebar';
import { PoliceSirenBorders } from '../../components/CommandCenter/PoliceSirenBorders';
import { 
  ShieldAlert, AlertTriangle, X
} from 'lucide-react';
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
      
      {/* ── Sidebar Izquierdo ─────────────────────────────────────────── */}
      

      {/* ── Área Principal: Tactical Map ──────────────────────────────── */}
      <main className="flex-1 relative bg-[var(--bg-app)]" style={{ minHeight: 0 }}>
        {/* KPI Bar */}
        <div 
          className="absolute top-6 right-6 z-10 flex gap-4 pointer-events-none"
          style={{ 
            left: sidebarOpen ? 360 : 110, 
            transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)' 
          }}
        >
           <div className="bg-[var(--bg-surface)] shadow-sm dark:shadow-md p-4 rounded flex items-center gap-4 pointer-events-auto">
             <div className="bg-red-500/15 text-red-600 dark:bg-red-950/60 dark:text-red-400 p-2.5 rounded shadow-xs flex items-center justify-center">
               <AlertTriangle size={24} />
             </div>
             <div>
               <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-widest font-black">Alertas Activas</div>
               <div className="text-2xl font-black text-[var(--text-primary)] tabular-nums">{activeCount ?? '0'}</div>
             </div>
           </div>

        </div>

        <TacticalMap />

        {/* Efecto Sirena Policial Neón (Bordes Superior, Derecho e Inferior) */}
        <PoliceSirenBorders active={activeCount > 0} />

        {/* Nearby Cameras Collage Panel */}
        {focusedAlertId && activeAlerts[focusedAlertId] && (
          <div 
            className="absolute bottom-6 right-[26rem] z-30 bg-[var(--bg-surface)] shadow-md dark:shadow-lg p-4 rounded flex flex-col gap-3 pointer-events-auto animate-in slide-in-from-bottom-4"
            style={{ 
              left: sidebarOpen ? 346 : 90, 
              transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)' 
            }}
          >
            <div className="flex justify-between items-center">
              <div className="text-xs uppercase text-[var(--text-primary)] font-bold tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--brand)] shadow-[0_0_8px_var(--brand)] animate-pulse"></span>
                Cámaras de Seguridad Cercanas (Radio 100m)
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-mono font-medium">
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
                      className="min-w-[200px] max-w-[240px] aspect-video bg-[var(--bg-surface)] rounded overflow-hidden shadow-sm hover:shadow-md flex flex-col relative group transition-all cursor-pointer"
                    >
                      <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white shadow z-10 flex items-center gap-1">
                        {streamUrl ? (
                          <>
                            <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>
                            LIVE
                          </>
                        ) : (
                          <>
                            <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                            OFFLINE
                          </>
                        )}
                      </div>
                      <div className="flex-1 bg-black/90 flex items-center justify-center relative overflow-hidden">
                        {streamUrl ? (
                          <iframe
                            src={streamUrl}
                            title={cam.name}
                            className="w-full h-full border-0 pointer-events-none"
                            allowFullScreen
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-[var(--text-muted)] p-2 text-center select-none">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Sin Señal</span>
                            <span className="text-[8px] font-mono max-w-xs truncate">{cam.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-1.5 bg-[var(--bg-surface)] flex items-center justify-between text-[9px] text-[var(--text-secondary)]">
                        <span className="font-bold truncate max-w-[120px]">{cam.name}</span>
                        <span className="font-mono text-[8px] text-[var(--text-muted)]">
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
                        className="w-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] text-[var(--text-primary)] text-[10px] py-1 font-bold transition-colors cursor-pointer"
                      >
                        ABRIR VIDEO FEED
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)] rounded shadow-inner">
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
              left: sidebarOpen ? 346 : 90, 
              transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)' 
            }}
          >
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
