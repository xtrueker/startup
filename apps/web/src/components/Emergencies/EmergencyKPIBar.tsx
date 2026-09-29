import React from 'react';
import { Siren, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface EmergencyKPIBarProps {
  total: number;
  pending: number;
  reviewing: number;
  resolved: number;
  statusFilter: 'all' | 'pending' | 'reviewing' | 'resolved';
  onSelectFilter: (filter: 'all' | 'pending' | 'reviewing' | 'resolved') => void;
}

export const EmergencyKPIBar: React.FC<EmergencyKPIBarProps> = ({
  total,
  pending,
  reviewing,
  resolved,
  statusFilter,
  onSelectFilter
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
      {/* Total */}
      <div 
        onClick={() => onSelectFilter('all')}
        className={`cursor-pointer rounded-xl p-3.5 flex items-center justify-between transition-colors ${
          statusFilter === 'all' 
            ? 'bg-[#18181b] border border-blue-500/60 ring-1 ring-blue-500/20 shadow-sm' 
            : 'bg-[#121214] border border-[#222226] hover:border-zinc-700'
        }`}
      >
        <div>
          <div className="text-xl font-bold text-zinc-100">{total}</div>
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Total Registradas</div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
          <Siren size={15} />
        </div>
      </div>

      {/* Críticas / Pendientes */}
      <div 
        onClick={() => onSelectFilter('pending')}
        className={`cursor-pointer rounded-xl p-3.5 flex items-center justify-between transition-colors ${
          statusFilter === 'pending' 
            ? 'bg-[#18181b] border border-red-500/60 ring-1 ring-red-500/20 shadow-sm' 
            : 'bg-[#121214] border border-[#222226] hover:border-zinc-700'
        }`}
      >
        <div>
          <div className="text-xl font-bold text-red-400 flex items-center gap-2">
            <span>{pending}</span>
            {pending > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
          </div>
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Críticas / Pendientes</div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-800/50 flex items-center justify-center text-red-400">
          <Clock size={15} />
        </div>
      </div>

      {/* En Revisión / Despacho */}
      <div 
        onClick={() => onSelectFilter('reviewing')}
        className={`cursor-pointer rounded-xl p-3.5 flex items-center justify-between transition-colors ${
          statusFilter === 'reviewing' 
            ? 'bg-[#18181b] border border-amber-500/60 ring-1 ring-amber-500/20 shadow-sm' 
            : 'bg-[#121214] border border-[#222226] hover:border-zinc-700'
        }`}
      >
        <div>
          <div className="text-xl font-bold text-amber-400">{reviewing}</div>
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">En Despacho / Revisión</div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center justify-center text-amber-400">
          <AlertCircle size={15} />
        </div>
      </div>

      {/* Resueltas */}
      <div 
        onClick={() => onSelectFilter('resolved')}
        className={`cursor-pointer rounded-xl p-3.5 flex items-center justify-between transition-colors ${
          statusFilter === 'resolved' 
            ? 'bg-[#18181b] border border-emerald-500/60 ring-1 ring-emerald-500/20 shadow-sm' 
            : 'bg-[#121214] border border-[#222226] hover:border-zinc-700'
        }`}
      >
        <div>
          <div className="text-xl font-bold text-emerald-400">{resolved}</div>
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Atendidas / Resueltas</div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
          <CheckCircle2 size={15} />
        </div>
      </div>
    </div>
  );
};
