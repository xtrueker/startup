import React from 'react';
import { Siren, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LiquidGlassCard } from '../ui/LiquidPrimitives';

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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 shrink-0">
      {/* Total */}
      <LiquidGlassCard
        strong={statusFilter === 'all'}
        onClick={() => onSelectFilter('all')}
        className={`cursor-pointer p-4 rounded-[24px] flex items-center justify-between transition-all hover:-translate-y-0.5 ${
          statusFilter === 'all' ? 'ring-2 ring-[#0EA5E9]/50' : ''
        }`}
      >
        <div>
          <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{total}</div>
          <div className="text-[11px] text-[var(--text-secondary)] font-semibold mt-0.5">Total registradas</div>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center text-[#0EA5E9]">
          <Siren size={19} />
        </div>
      </LiquidGlassCard>

      {/* Críticas / Pendientes */}
      <LiquidGlassCard
        strong={statusFilter === 'pending'}
        onClick={() => onSelectFilter('pending')}
        className={`cursor-pointer p-4 rounded-[24px] flex items-center justify-between transition-all hover:-translate-y-0.5 ${
          statusFilter === 'pending' ? 'ring-2 ring-rose-500/55' : ''
        }`}
      >
        <div>
          <div className="text-2xl font-bold text-[#E11D48] dark:text-rose-400 flex items-center gap-2 tabular-nums">
            <span>{pending}</span>
            {pending > 0 && <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-pulse" />}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] font-semibold mt-0.5">Críticas / Pendientes</div>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-rose-500/12 border border-rose-500/25 text-[#E11D48] dark:text-rose-400 flex items-center justify-center">
          <Clock size={19} />
        </div>
      </LiquidGlassCard>

      {/* En Revisión / Despacho */}
      <LiquidGlassCard
        strong={statusFilter === 'reviewing'}
        onClick={() => onSelectFilter('reviewing')}
        className={`cursor-pointer p-4 rounded-[24px] flex items-center justify-between transition-all hover:-translate-y-0.5 ${
          statusFilter === 'reviewing' ? 'ring-2 ring-amber-500/55' : ''
        }`}
      >
        <div>
          <div className="text-2xl font-bold text-[#D97706] dark:text-amber-400 tabular-nums">{reviewing}</div>
          <div className="text-[11px] text-[var(--text-secondary)] font-semibold mt-0.5">En despacho / Revisión</div>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-amber-500/12 border border-amber-500/25 text-[#D97706] dark:text-amber-400 flex items-center justify-center">
          <AlertCircle size={19} />
        </div>
      </LiquidGlassCard>

      {/* Resueltas */}
      <LiquidGlassCard
        strong={statusFilter === 'resolved'}
        onClick={() => onSelectFilter('resolved')}
        className={`cursor-pointer p-4 rounded-[24px] flex items-center justify-between transition-all hover:-translate-y-0.5 ${
          statusFilter === 'resolved' ? 'ring-2 ring-emerald-500/55' : ''
        }`}
      >
        <div>
          <div className="text-2xl font-bold text-[#0D9488] dark:text-emerald-400 tabular-nums">{resolved}</div>
          <div className="text-[11px] text-[var(--text-secondary)] font-semibold mt-0.5">Atendidas / Resueltas</div>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 text-[#0D9488] dark:text-emerald-400 flex items-center justify-center">
          <CheckCircle2 size={19} />
        </div>
      </LiquidGlassCard>
    </div>
  );
};
