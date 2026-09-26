import { useState } from 'react';
import { Search, CheckCircle, ShieldAlert, Info } from 'lucide-react';
import { AlertTimeline } from '../../components/CommandCenter/AlertTimeline';

export default function CitizenTracker() {
  const [trackingId, setTrackingId] = useState('');
  const [searchedId, setSearchedId] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-20 px-4 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-indigo-600 p-8 text-white text-center">
          <ShieldAlert size={48} className="mx-auto mb-4 drop-shadow-md" />
          <h1 className="text-2xl font-black tracking-tight">Seguimiento de Reporte</h1>
          <p className="text-indigo-100 text-sm mt-2 font-medium">Consulta el estado operativo de tu alerta en tiempo real.</p>
        </div>
        
        <div className="p-6">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Código de Seguimiento</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Ej: d8a7b-39cf-..." 
              value={trackingId}
              onChange={e => setTrackingId(e.target.value)}
              className="flex-1 border-2 border-slate-200 rounded-lg px-4 py-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-sm transition-all"
            />
            <button 
              onClick={() => setSearchedId(trackingId)}
              disabled={trackingId.length < 5}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Search size={20} />
            </button>
          </div>

          {searchedId && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 text-emerald-700 font-bold mb-4 bg-emerald-50 p-3 rounded-lg border border-emerald-200 shadow-sm">
                <CheckCircle size={20} />
                Reporte Encontrado en el Sistema
              </div>
              
              <div className="bg-slate-900 rounded-xl p-6 shadow-inner border border-slate-800">
                {/* Reutilizamos el timeline pero le pasamos el prop de diseño oscuro */}
                <AlertTimeline alertId={searchedId} />
              </div>
              
              <p className="text-[11px] text-slate-500 mt-4 text-center flex items-center justify-center gap-1 bg-slate-100 p-2 rounded">
                <Info size={14} className="text-indigo-500" />
                Por seguridad y privacidad de la investigación, ciertas notas operativas policiales permanecen ocultas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
