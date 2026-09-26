import React, { useEffect, useState, useMemo } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useCommandStore } from '../../stores/useCommandStore';
import { TacticalMap } from '../../components/CommandCenter/TacticalMap';
import { AudioStreamer } from '../../components/CommandCenter/AudioStreamer';
import { AlertWizardSidebar } from '../../components/CommandCenter/AlertWizardSidebar';
import { Activity, Layers, ShieldAlert, Filter, Clock, Play, Pause, AlertTriangle, BarChart2, Users, MapPin, X } from 'lucide-react';

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
    pushAudioChunk, setFilters, filterSeverity, filterType,
    isReplayMode, setReplayMode,
    focusedAlertId, focusMapOnAlert, updateAlertStatus,
    ghostVictims, predictiveCameras, selectedCamera, setSelectedCamera,
    systemCameras
  } = useCommandStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupervisorMode, setIsSupervisorMode] = useState(false);

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
  const avgResponseTime = activeCount > 0 ? '1.2m' : '--';

  // Sort alerts by Priority SLA (Emergency/Robo first, then by waiting time)
  const sortedAlerts = Object.values(activeAlerts).sort((a, b) => {
     let scoreA = 0;
     let scoreB = 0;
     
     // Base weight by type
     if (a.description?.toLowerCase().includes('robo') || a.description?.toLowerCase().includes('emergencia')) scoreA += 50;
     if (b.description?.toLowerCase().includes('robo') || b.description?.toLowerCase().includes('emergencia')) scoreB += 50;
     
     // Time weight (+2 pts per minute waiting)
     const minsA = (Date.now() - new Date(a.timestamp).getTime()) / 60000;
     const minsB = (Date.now() - new Date(b.timestamp).getTime()) / 60000;
     scoreA += minsA * 2;
     scoreB += minsB * 2;
     
     return scoreB - scoreA; // Descending
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
    <div className="flex h-full w-full bg-slate-900 overflow-hidden font-sans text-slate-200">
      
      {/* ── Sidebar Izquierdo: Controles Críticos ─────────────────────── */}
      <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-500 font-black uppercase tracking-widest text-sm">
            <ShieldAlert size={18} /> Central de Despacho
          </div>
          <div className={`text-xs px-2.5 py-1.5 rounded-md font-bold inline-flex items-center gap-1.5 shadow-sm w-max ${connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-400 shadow-[0_0_8px_#fb7185]'}`}></span>
            {connected ? 'En Vivo (0ms lag)' : 'Reconectando Canales...'}
          </div>
        </div>

        {/* Filtros Tácticos */}
        <div className="px-5 py-4 bg-slate-900/40 backdrop-blur border-b border-slate-800/80 flex flex-col gap-3">
           <h3 className="text-xs uppercase text-slate-400 font-bold flex items-center gap-2">
             <Filter size={14} className="text-indigo-400" /> Filtros Tácticos
           </h3>
           <div className="flex gap-3 text-xs">
             <select 
               value={filterSeverity} 
               onChange={e => setFilters({ severity: e.target.value })}
               className="bg-slate-800/80 border border-slate-700 rounded-md px-3 py-2 flex-1 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-inner appearance-none"
             >
               <option value="all">Todas Gravedades</option>
               <option value="critical">Críticas</option>
               <option value="high">Altas</option>
             </select>
             <select 
               value={filterType}
               onChange={e => setFilters({ type: e.target.value })}
               className="bg-slate-800/80 border border-slate-700 rounded-md px-3 py-2 flex-1 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-inner appearance-none"
             >
               <option value="all">Todos Tipos</option>
               <option value="robo">Robos</option>
               <option value="emergency">Emergencias</option>
             </select>
           </div>
        </div>

        {/* Lista de Eventos Virtualizada */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
           <h3 className="text-xs uppercase text-slate-400 font-bold mb-2 flex items-center gap-2 tracking-wider">
              <Activity size={14} className="text-indigo-400" /> {`Emergencias Activas (${activeCount})`}
           </h3>
           
           {sortedAlerts.map(alert => {
             const minsWaiting = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 60000);
             const isOverdue = minsWaiting > 5;

             return (
             <div 
               key={alert.id} 
               onClick={() => focusMapOnAlert(alert.id)}
               className={`rounded-lg p-3 border flex flex-col gap-2 cursor-pointer transition-colors ${focusedAlertId === alert.id ? 'bg-indigo-900/40 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'bg-slate-800 border-slate-700/50 hover:border-slate-500'} ${isOverdue ? 'border-l-4 border-l-rose-500' : ''}`}
             >
               <div className="flex justify-between items-start">
                 <div className="text-sm font-semibold text-rose-400">{alert.description}</div>
                 {isOverdue && <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1 rounded animate-pulse">SLA VENCIDO</span>}
               </div>
               <div className="text-xs text-slate-400">{alert.sourceLocation.address}</div>
               <div className="text-[10px] text-slate-500 flex justify-between">
                 <span>Espera: {minsWaiting}m</span>
                 <span className="uppercase text-amber-500">{alert.status}</span>
               </div>
               
               <AudioStreamer alertId={alert.id} />
             </div>
           )})}
           
           {activeCount === 0 && (
             <div className="p-5 flex flex-col gap-4">
                <div className="text-xs text-slate-400 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-inner flex flex-col gap-1">
                   <span className="text-emerald-400">{`> Zona Nacional Despejada`}</span>
                   <span className="text-slate-500">{`> Escuchando frecuencia principal...`}</span>
                </div>
             </div>
           )}
        </div>

        {/* Tactical Toolbar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2">
           <button 
             onClick={toggleHeatmap}
             className={`flex items-center justify-center gap-2 w-full py-2 rounded text-sm font-bold transition-all ${heatmapEnabled ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
           >
             <Layers size={16} /> 
             {heatmapEnabled ? 'Modo Predictivo (ON)' : 'Análisis Heatmap'}
           </button>
        </div>
      </aside>

      {/* ── Área Principal: Tactical Map ──────────────────────────────── */}
      <main className="flex-1 relative bg-black" style={{ minHeight: 0 }}>
        {/* KPI Bar */}
        <div className="absolute top-6 left-6 right-6 z-10 flex gap-4 pointer-events-none">
           <div className="glass-panel p-4 rounded-xl flex items-center gap-4 pointer-events-auto">
             <div className="bg-rose-500/20 p-2 rounded-lg">
               <AlertTriangle className="text-rose-500" size={24} />
             </div>
             <div>
               <div className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">Alertas Activas</div>
               <div className="text-2xl font-black text-white tabular-nums drop-shadow-md">{activeCount ?? '0'}</div>
             </div>
           </div>
           <div className="glass-panel p-4 rounded-xl flex items-center gap-4 pointer-events-auto">
             <div className="bg-emerald-500/20 p-2 rounded-lg">
               <Clock className="text-emerald-500" size={24} />
             </div>
             <div>
               <div className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">Tiempo Prom. Resp.</div>
               <div className="text-2xl font-black text-white tabular-nums drop-shadow-md">{avgResponseTime ?? '--'}</div>
             </div>
           </div>
        </div>

        <TacticalMap />

        {/* Nearby Cameras Collage Panel */}
        {focusedAlertId && activeAlerts[focusedAlertId] && (
          <div className="absolute bottom-6 left-6 right-[26rem] z-30 glass-panel p-4 rounded-xl flex flex-col gap-3 pointer-events-auto animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <div className="text-xs uppercase text-slate-300 font-black tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
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
                      className="min-w-[200px] max-w-[240px] aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex flex-col relative group hover:border-blue-500/50 transition-colors cursor-pointer"
                    >
                      <div className="absolute top-1.5 right-1.5 bg-slate-900/80 backdrop-blur px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-slate-300 shadow z-10 flex items-center gap-1">
                        {streamUrl ? (
                          <>
                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
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
                            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Sin Señal</span>
                            <span className="text-[8px] font-mono max-w-xs truncate">{cam.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-1.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-300">
                        <span className="font-bold truncate max-w-[120px]">{cam.name}</span>
                        <span className="font-mono text-[8px] text-slate-500">
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
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] py-1 font-bold transition-colors border-t border-blue-700"
                      >
                        📹 ABRIR VIDEO FEED
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800/50">
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
                <div className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Clock size={16} className="text-indigo-400" />
                  Máquina del Tiempo (Replay Histórico)
                </div>
                <button 
                  onClick={() => setReplayMode(!isReplayMode)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${isReplayMode ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50 hover:bg-indigo-600/30' : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
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

        {/* Top Floating Dashboard Toggle for Supervisors */}
        <div className="absolute top-4 left-80 right-0 flex justify-center z-20 pointer-events-none">
           <button 
             onClick={() => setIsSupervisorMode(!isSupervisorMode)}
             className={`pointer-events-auto px-6 py-2 rounded-full font-bold shadow-xl border flex items-center gap-2 transition-all ${isSupervisorMode ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900/80 backdrop-blur border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'}`}
           >
             <BarChart2 size={18} />
             {isSupervisorMode ? 'Ocultar Panel Gerencial' : 'Panel de Supervisor'}
           </button>
        </div>

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
                     <span className="z-10 text-slate-500 font-mono text-xs">Conectando RTSP...<br/>{cam.rtspUrl}</span>
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

        {/* Supervisor Managerial Overlay */}
        {isSupervisorMode && (
          <div className="absolute top-20 left-80 right-96 bottom-8 z-30 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700 p-8 overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95">
             <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
               <div>
                 <h2 className="text-3xl font-black text-white flex items-center gap-3"><BarChart2 className="text-indigo-500" size={32} /> Visión Táctica (Supervisión)</h2>
                 <p className="text-slate-400 mt-1">Métricas operativas de la última hora en tiempo real.</p>
               </div>
               <div className="flex gap-4 text-center">
                 <div className="bg-slate-800 rounded-lg p-3 px-6 border border-slate-700">
                    <div className="text-3xl font-black text-emerald-400">92%</div>
                    <div className="text-xs text-slate-400 uppercase tracking-widest mt-1">Cumplimiento SLA</div>
                 </div>
                 <div className="bg-slate-800 rounded-lg p-3 px-6 border border-slate-700">
                    <div className="text-3xl font-black text-rose-500">2</div>
                    <div className="text-xs text-slate-400 uppercase tracking-widest mt-1">Alertas Vencidas</div>
                 </div>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-8">
                {/* Zonas Calientes */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                   <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><MapPin className="text-rose-500" /> Top 3 Barrios Críticos</h3>
                   <div className="flex flex-col gap-3">
                     {[
                       { name: 'Centro Histórico', incidents: 12, trend: '+3' },
                       { name: 'Distrito Financiero', incidents: 8, trend: '-1' },
                       { name: 'Zona Industrial Sur', incidents: 5, trend: '+5' }
                     ].map((zone, i) => (
                       <div key={zone.name} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-800">
                         <div className="flex items-center gap-3">
                           <div className="bg-rose-500/20 text-rose-500 font-black h-8 w-8 flex items-center justify-center rounded-full">{i + 1}</div>
                           <span className="font-semibold text-slate-300">{zone.name}</span>
                         </div>
                         <div className="flex items-center gap-4">
                           <span className="text-sm text-slate-400">{zone.incidents} incidentes</span>
                           <span className={`text-xs font-bold px-2 py-1 rounded ${zone.trend.startsWith('+') ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{zone.trend} hoy</span>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Carga Operativa */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                   <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><Users className="text-blue-500" /> Carga Operativa (Turno Actual)</h3>
                   <div className="flex flex-col gap-3">
                     {[
                       { op: 'Op. Alpha', active: 4, resolved: 15, status: 'Sobrecargado' },
                       { op: 'Op. Bravo', active: 1, resolved: 8, status: 'Óptimo' },
                       { op: 'Op. Charlie', active: 0, resolved: 2, status: 'Disponible' }
                     ].map((op) => (
                       <div key={op.op} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-800">
                         <div>
                           <div className="font-semibold text-slate-300">{op.op}</div>
                           <div className="text-[10px] text-slate-500 uppercase mt-1">Activas: {op.active} | Resueltas/hora: {op.resolved}</div>
                         </div>
                         <div className={`text-xs font-bold px-2 py-1 rounded border ${op.status === 'Sobrecargado' ? 'border-rose-500/50 text-rose-400 bg-rose-500/10' : op.status === 'Disponible' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-blue-500/50 text-blue-400 bg-blue-500/10'}`}>
                           {op.status}
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
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
                  <div className="flex flex-col items-center gap-4 text-slate-500">
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
