import React, { useState } from 'react';
import { useCommandStore } from '../../stores/useCommandStore';
import type { EmergencyAlert } from '../../stores/useCommandStore';
import { AlertTimeline } from './AlertTimeline';
import { X, CheckCircle, ShieldAlert, Eye, FileArchive } from 'lucide-react';
import api from '../../services/api';

interface Props {
  alert: EmergencyAlert;
  onClose: () => void;
}

export const AlertWizardSidebar: React.FC<Props> = ({ alert, onClose }) => {
  const [note, setNote] = useState('');
  const updateAlertStatus = useCommandStore(state => state.updateAlertStatus);
  const isDrawingRoute = useCommandStore(state => state.isDrawingRoute);
  const escapeRouteWaypoints = useCommandStore(state => state.escapeRouteWaypoints);
  
  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await api.patch(`/alerts/${alert.id}/status`, { status: newStatus, notes: note });
      if (res.status === 200 || res.status === 201) {
        setNote('');
        updateAlertStatus(alert.id, newStatus);
      } else {
        console.error('Fallo al actualizar el estado de la alerta');
      }
    } catch (err) {
      console.error('Error de red al cambiar estado:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-[#fda4af] border-[#881337]/50 bg-[#881337]/25 font-bold';
      case 'reviewing': return 'text-[#fde68a] border-[#78350f]/50 bg-[#78350f]/25';
      case 'verified': return 'text-[#7dd3fc] border-[#0369a1]/50 bg-[#0c4a6e]/25 font-semibold';
      case 'resolved': return 'text-[#86efac] border-[#047857]/50 bg-[#064e3b]/25';
      default: return 'text-[#a3a3a3] border-[#262626] bg-[#141414]';
    }
  };

  return (
    <div className="w-96 bg-[#0a0a0a] border-l border-[#262626] flex flex-col h-full shadow-[-10px_0_30px_rgba(0,0,0,0.6)] z-30 animate-in slide-in-from-right text-[#efede3]">
      {/* Header */}
      <div className="p-4 border-b border-[#262626] flex items-start justify-between bg-[#121212]">
        <div>
          <h2 className="text-base font-black text-[#efede3] flex items-center gap-2">
            <ShieldAlert className="text-[#fb7185]" size={18} />
            Asistente de Alerta
          </h2>
          <div className="text-xs text-[#737373] font-mono mt-0.5">ID: {alert.id.split('-')[0]}...</div>
        </div>
        <button onClick={onClose} className="text-[#737373] hover:text-[#efede3] transition-colors p-1 rounded hover:bg-[#1a1a1a]">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
        {/* Info Card */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-3.5">
           <div className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(alert.status)}`}>
             Estado Actual: {alert.status}
           </div>
           <p className="text-[#efede3] mt-2.5 font-medium text-sm leading-snug">{alert.description || 'Sin descripción'}</p>
           <p className="text-[#737373] text-xs mt-1.5 font-mono">{alert.sourceLocation.address || 'Ubicación GPS'}</p>
        </div>

        {/* Action Wizard */}
        <div className="flex flex-col gap-2">
           <h3 className="text-xs font-bold uppercase text-[#737373] tracking-wider">Acciones Operativas</h3>
           
           <textarea 
             placeholder="Nota operativa obligatoria..."
             value={note}
             onChange={e => setNote(e.target.value)}
             className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg p-2.5 text-sm text-[#efede3] outline-none focus:border-[#404040] min-h-[64px] resize-none font-mono"
           />

           <div className="grid grid-cols-2 gap-2 mt-2">
              <button 
                onClick={() => handleStatusChange('reviewing')}
                disabled={alert.status !== 'pending' || note.length < 5}
                className="flex items-center justify-center gap-2 bg-[#171717] text-[#d4d4d4] border border-[#2a2a2a] p-2 rounded-lg text-xs font-semibold hover:bg-[#222222] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Eye size={14} /> Tomar Control
              </button>
              <button 
                onClick={() => handleStatusChange('verified')}
                disabled={alert.status !== 'reviewing' || note.length < 5}
                className="flex items-center justify-center gap-2 bg-[#171717] text-[#7dd3fc] border border-[#0369a1]/40 p-2 rounded-lg text-xs font-semibold hover:bg-[#0c4a6e]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <CheckCircle size={14} /> Verificar
              </button>
              <button 
                onClick={() => handleStatusChange('resolved')}
                disabled={!['reviewing', 'verified'].includes(alert.status) || note.length < 5}
                className="col-span-2 flex items-center justify-center gap-2 bg-[#efede3] text-[#0a0a0a] border border-[#efede3] p-2.5 rounded-lg text-xs font-black hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all mt-1 uppercase tracking-wider shadow-sm"
              >
                <FileArchive size={15} /> Resolver y Archivar
              </button>
           </div>
           {note.length < 5 && (
             <span className="text-[10px] text-[#737373] text-center block mt-1">* Se requiere una nota mínima de 5 caracteres.</span>
           )}
        </div>

        {/* --- REPORTE POST-EVENTO (Motor Predictivo) --- */}
        <div className="flex flex-col gap-2 mt-4 border-t border-[#262626] pt-4">
           <h3 className="text-xs font-bold uppercase text-[#efede3] tracking-wider">Reporte Post-Evento (IA)</h3>
           <p className="text-[10px] text-[#737373] leading-tight">Dibuja la ruta de escape real en el mapa para entrenar al Motor Predictivo de Rutas y mejorar la precisión del algoritmo espacial.</p>
           
           {!isDrawingRoute ? (
             <button 
               onClick={() => useCommandStore.getState().setDrawingRoute(true)}
               className="w-full bg-[#171717] border border-[#2a2a2a] text-[#efede3] hover:bg-[#222222] py-2 rounded-lg text-xs font-semibold transition-colors"
             >
               Trazar Ruta de Escape Real
             </button>
           ) : (
             <div className="flex flex-col gap-2">
               <div className="bg-[#171717] border border-[#333333] p-2 rounded-lg text-xs text-[#efede3]">
                 Modo dibujo activo: Haz clics en el mapa para trazar la ruta.
               </div>
               
               <div className="grid grid-cols-2 gap-2">
                 <button 
                   onClick={async () => {
                     useCommandStore.getState().undoLastWaypoint();
                     const { escapeRouteWaypoints, setEscapeRoutePoints } = useCommandStore.getState();
                     if (escapeRouteWaypoints.length < 2) {
                       setEscapeRoutePoints(escapeRouteWaypoints);
                     } else {
                       try {
                         const snappedPath = await import('../../services/routingService').then(m => m.routingService.getSnappedRoute(escapeRouteWaypoints));
                         setEscapeRoutePoints(snappedPath);
                       } catch (err) {
                         setEscapeRoutePoints(escapeRouteWaypoints);
                       }
                     }
                   }}
                   disabled={escapeRouteWaypoints.length === 0}
                   className="w-full bg-[#171717] hover:bg-[#222222] text-[#d4d4d4] py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-[#2a2a2a]"
                 >
                   Deshacer
                 </button>
                 
                 <button 
                   onClick={() => {
                     useCommandStore.getState().clearEscapeRoute();
                     window.alert("Modelo Predictivo Actualizado ✅\nLa ruta ha sido guardada y procesada por la IA.");
                   }}
                   className="w-full bg-[#efede3] hover:bg-white text-[#0a0a0a] py-2 rounded-lg text-xs font-bold transition-colors"
                 >
                   Guardar y Entrenar IA
                 </button>
               </div>
             </div>
           )}
        </div>
        {/* --------------------------------------------- */}

        {/* Timeline */}
        <AlertTimeline alertId={alert.id} />
      </div>
    </div>
  );
};
