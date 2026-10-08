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
        className={`cursor-pointer rounded p-3.5 flex items-center justify-between transition-all ${
          statusFilter === 'all' 
            ? 'bg-[var(--bg-elevated)] shadow-md ring-2 ring-[var(--brand)]/40 scale-[1.01]' 
            : 'bg-[var(--bg-surface)] shadow-sm hover:shadow-md hover:bg-[var(--bg-elevated)]'
        }`}
      >
        <div>
          <div className="text-xl font-bold text-[var(--text-primary)]">{total}</div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Total Registradas</div>
        </div>
        <div className="w-8 h-8 rounded bg-[var(--bg-elevated)] shadow-xs flex items-center justify-center text-[var(--text-secondary)]">
          <Siren size={15} />
        </div>
      </div>

      {/* Críticas / Pendientes */}
      <div 
        onClick={() => onSelectFilter('pending')}
        className={`cursor-pointer rounded p-3.5 flex items-center justify-between transition-all ${
          statusFilter === 'pending' 
            ? 'bg-[var(--bg-elevated)] shadow-md ring-2 ring-red-500/40 scale-[1.01]' 
            : 'bg-[var(--bg-surface)] shadow-sm hover:shadow-md hover:bg-[var(--bg-elevated)]'
        }`}
      >
        <div>
          <div className="text-xl font-black text-red-600 dark:text-red-400 flex items-center gap-2">
            <span>{pending}</span>
            {pending > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Críticas / Pendientes</div>
        </div>
        <div className="w-8 h-8 rounded bg-red-500/15 text-red-600 dark:bg-red-950/60 dark:text-red-400 shadow-xs flex items-center justify-center">
          <Clock size={15} />
        </div>
      </div>

      {/* En Revisión / Despacho */}
      <div 
        onClick={() => onSelectFilter('reviewing')}
        className={`cursor-pointer rounded p-3.5 flex items-center justify-between transition-all ${
          statusFilter === 'reviewing' 
            ? 'bg-[var(--bg-elevated)] shadow-md ring-2 ring-amber-500/40 scale-[1.01]' 
            : 'bg-[var(--bg-surface)] shadow-sm hover:shadow-md hover:bg-[var(--bg-elevated)]'
        }`}
      >
        <div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400">{reviewing}</div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">En Despacho / Revisión</div>
        </div>
        <div className="w-8 h-8 rounded bg-amber-500/15 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 shadow-xs flex items-center justify-center">
          <AlertCircle size={15} />
        </div>
      </div>

      {/* Resueltas */}
      <div 
        onClick={() => onSelectFilter('resolved')}
        className={`cursor-pointer rounded p-3.5 flex items-center justify-between transition-all ${
          statusFilter === 'resolved' 
            ? 'bg-[var(--bg-elevated)] shadow-md ring-2 ring-emerald-500/40 scale-[1.01]' 
            : 'bg-[var(--bg-surface)] shadow-sm hover:shadow-md hover:bg-[var(--bg-elevated)]'
        }`}
      >
        <div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{resolved}</div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Atendidas / Resueltas</div>
        </div>
        <div className="w-8 h-8 rounded bg-emerald-500/15 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-xs flex items-center justify-center">
          <CheckCircle2 size={15} />
        </div>
      </div>
    </div>
  );
};
