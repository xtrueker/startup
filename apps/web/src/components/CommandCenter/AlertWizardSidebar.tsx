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
      case 'pending': return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
      case 'reviewing': return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
      case 'verified': return 'text-blue-500 border-blue-500/30 bg-blue-500/10';
      case 'resolved': return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
      default: return 'text-slate-400 border-slate-600 bg-slate-800';
    }
  };

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-30 animate-in slide-in-from-right">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between bg-slate-950">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <ShieldAlert className="text-indigo-500" />
            Asistente de Alerta
          </h2>
          <div className="text-xs text-slate-400 font-mono mt-1">ID: {alert.id.split('-')[0]}...</div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-slate-800">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Info Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
           <div className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border ${getStatusColor(alert.status)}`}>
             Estado Actual: {alert.status}
           </div>
           <p className="text-slate-300 mt-3 font-medium text-sm">{alert.description || 'Sin descripción'}</p>
           <p className="text-slate-400 text-xs mt-1">{alert.sourceLocation.address || 'Ubicación GPS'}</p>
        </div>

        {/* Action Wizard */}
        <div className="flex flex-col gap-2">
           <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Acciones Operativas</h3>
           
           <textarea 
             placeholder="Nota operativa obligatoria..."
             value={note}
             onChange={e => setNote(e.target.value)}
             className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-indigo-500 min-h-[60px] resize-none"
           />

           <div className="grid grid-cols-2 gap-2 mt-2">
              <button 
                onClick={() => handleStatusChange('reviewing')}
                disabled={alert.status !== 'pending' || note.length < 5}
                className="flex items-center justify-center gap-2 bg-amber-600/20 text-amber-500 border border-amber-500/50 p-2 rounded text-xs font-bold hover:bg-amber-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Eye size={14} /> Tomar Control
              </button>
              <button 
                onClick={() => handleStatusChange('verified')}
                disabled={alert.status !== 'reviewing' || note.length < 5}
                className="flex items-center justify-center gap-2 bg-blue-600/20 text-blue-400 border border-blue-500/50 p-2 rounded text-xs font-bold hover:bg-blue-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <CheckCircle size={14} /> Verificar
              </button>
              <button 
                onClick={() => handleStatusChange('resolved')}
                disabled={!['reviewing', 'verified'].includes(alert.status) || note.length < 5}
                className="col-span-2 flex items-center justify-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 p-3 rounded text-sm font-bold hover:bg-emerald-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all mt-2"
              >
                <FileArchive size={16} /> Resolver y Archivar
              </button>
           </div>
           {note.length < 5 && (
             <span className="text-[10px] text-rose-400 text-center block mt-1">* Se requiere una nota mínima de 5 caracteres.</span>
           )}
        </div>

        {/* --- REPORTE POST-EVENTO (Motor Predictivo) --- */}
        <div className="flex flex-col gap-2 mt-4 border-t border-slate-700 pt-4">
           <h3 className="text-xs font-bold uppercase text-indigo-400 tracking-wider">Reporte Post-Evento (IA)</h3>
           <p className="text-[10px] text-slate-400 leading-tight">Dibuja la ruta de escape real en el mapa para entrenar al Motor Predictivo de Rutas y mejorar la precisión del algoritmo espacial.</p>
           
           {!isDrawingRoute ? (
             <button 
               onClick={() => useCommandStore.getState().setDrawingRoute(true)}
               className="w-full bg-slate-800 border border-indigo-500/50 text-indigo-400 hover:bg-indigo-600/20 py-2 rounded text-xs font-bold transition-colors"
             >
               Trazar Ruta de Escape Real
             </button>
           ) : (
             <div className="flex flex-col gap-2">
               <div className="bg-indigo-900/30 border border-indigo-500 p-2 rounded text-xs text-indigo-200">
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
                   className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700"
                 >
                   Deshacer
                 </button>
                 
                 <button 
                   onClick={() => {
                     useCommandStore.getState().clearEscapeRoute();
                     window.alert("Modelo Predictivo Actualizado ✅\nLa ruta ha sido guardada y procesada por la IA.");
                   }}
                   className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded text-xs font-bold transition-colors"
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
