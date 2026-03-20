import React, { useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useCommandStore } from '../../stores/useCommandStore';
import { TacticalMap } from '../../components/CommandCenter/TacticalMap';
import { TacticalHeatmapLayer } from '../../components/CommandCenter/TacticalHeatmapLayer';
import { AudioStreamer } from '../../components/CommandCenter/AudioStreamer';
import { Activity, Map as MapIcon, Layers, ShieldAlert } from 'lucide-react';

const CommandCenter: React.FC = () => {
  const { socket, connected } = useSocket({ namespace: '/operators' });
  
  // Zustand actions
  const injectAlert = useCommandStore(s => s.injectAlert);
  const resolveAlert = useCommandStore(s => s.resolveAlert);
  const toggleHeatmap = useCommandStore(s => s.toggleHeatmap);
  const heatmapEnabled = useCommandStore(s => s.heatmapEnabled);
  const pushAudioChunk = useCommandStore(s => s.pushAudioChunk);
  const activeAlerts = useCommandStore(s => s.activeAlerts);

  // ── Socket Events -> Zustand Dispatcher ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('alert:new', (alertData) => {
      // Mapeo adaptativo desde el formato del WS antiguo al nuevo modelo Táctico
      injectAlert({
        id: alertData.id.toString(),
        timestamp: new Date().toISOString(),
        sourceLocation: { 
          lat: alertData.location.latitude, 
          lng: alertData.location.longitude,
          address: alertData.location.address
        },
        status: 'critical',
        userId: alertData.userId || 'citizen_unknown',
        description: alertData.type || 'Pánico Disparado',
      });
      console.log('🚨 [Store] Inyectada nueva alerta táctica');
    });

    socket.on('alert:deleted', ({ id }) => resolveAlert(id.toString()));
    socket.on('alert:cancelled', ({ id }) => resolveAlert(id.toString()));

    // Simulación temporal de chunks de audio inyectados por WebSocket para retrocompatibilidad
    socket.on('evidence:audio_chunk', ({ alertId, url }) => {
       pushAudioChunk(alertId, url);
    });

    return () => {
      socket.off('alert:new');
      socket.off('alert:deleted');
      socket.off('alert:cancelled');
      socket.off('evidence:audio_chunk');
    };
  }, [socket, injectAlert, resolveAlert, pushAudioChunk]);

  return (
    <div className="flex h-screen w-screen bg-slate-900 overflow-hidden font-sans text-slate-200">
      
      {/* ── Sidebar Izquierdo: Controles Críticos ─────────────────────── */}
      <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-rose-500 font-bold uppercase tracking-wider text-sm">
            <ShieldAlert size={18} /> Central de Despacho
          </div>
          <div className={`text-xs px-2 py-1 rounded inline-block w-max ${connected ? 'bg-emerald-900/50 text-emerald-400' : 'bg-rose-900/50 text-rose-400'}`}>
            {connected ? '● En Vivo (0ms lag)' : '○ Reconectando Canales...'}
          </div>
        </div>

        {/* Lista de Eventos Virtualizada (Representada simple para el layout) */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
           <h3 className="text-xs uppercase text-slate-500 font-bold mb-1 flex items-center gap-2">
              <Activity size={14} /> Emergencias Activas ({Object.keys(activeAlerts).length})
           </h3>
           
           {Object.values(activeAlerts).map(alert => (
             <div key={alert.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700/50 flex flex-col gap-2 hover:border-slate-500 transition-colors">
               <div className="text-sm font-semibold text-rose-400">{alert.description}</div>
               <div className="text-xs text-slate-400">{alert.sourceLocation.address}</div>
               
               {/* Instancia ÚNICA de AudioStreamer para esta alerta */}
               <AudioStreamer alertId={alert.id} />
             </div>
           ))}
           
           {Object.keys(activeAlerts).length === 0 && (
             <div className="text-center text-slate-500/50 text-sm mt-10 p-6 border border-dashed border-slate-700 rounded-lg">
                Zona Nacional Despejada.<br/>Escuchando frecuencia...
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
      <main className="flex-1 relative bg-black">
         <TacticalMap />
      </main>

    </div>
  );
};

export default CommandCenter;
