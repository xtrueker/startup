import React from 'react';
import { MapPin, Activity, UserCog, Clock } from 'lucide-react';
import type { Alert as ApiAlert } from '../../services/alerts';
import { stripEmojis, type AssignedOperatorInfo } from './types';

interface EmergencySummarySectionProps {
  alert: ApiAlert;
  operator: AssignedOperatorInfo;
}

export const EmergencySummarySection: React.FC<EmergencySummarySectionProps> = ({
  alert,
  operator,
}) => {
  const alertLat = alert.location?.latitude || 4.6097;
  const alertLng = alert.location?.longitude || -74.0817;

  const cleanDescription = stripEmojis(
    alert.description || 'Alerta disparada desde terminal móvil ciudadana con telemetría en tiempo real.'
  );

  return (
    <div className="space-y-4">
      {/* Tarjetas de métricas rápidas del incidente */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[20px] p-3.5 space-y-1">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">Estado Operativo</span>
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="capitalize">{alert.status || 'Activa en Despacho'}</span>
          </div>
        </div>

        <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[20px] p-3.5 space-y-1">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">Hora de Activación</span>
          <div className="text-sm font-semibold text-[var(--text-primary)] font-mono flex items-center gap-2">
            <Clock size={13} className="text-[#0EA5E9]" />
            <span>{new Date(alert.createdAt).toLocaleTimeString('es-ES')}</span>
          </div>
        </div>

        <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[20px] p-3.5 space-y-1">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">Prioridad Táctica</span>
          <div className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <Activity size={13} className="text-rose-500" />
            <span>Prioridad Alta</span>
          </div>
        </div>
      </div>

      {/* Ubicación y Coordenadas */}
      <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[22px] p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#0EA5E9] uppercase tracking-wider">
          <MapPin size={14} className="text-[#0EA5E9]" />
          <span>Ubicación y Coordenadas del Incidente</span>
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {stripEmojis(alert.location?.address) || 'Dirección no nominal / Coordenadas fijadas en vivo'}
        </p>
        <div className="text-xs font-mono text-[var(--text-secondary)] flex items-center gap-4">
          <span>Latitud: <span className="text-[#0EA5E9] font-semibold">{alertLat.toFixed(6)}</span></span>
          <span>Longitud: <span className="text-[#0EA5E9] font-semibold">{alertLng.toFixed(6)}</span></span>
        </div>
        <div className="pt-2.5 border-t border-[var(--border-subtle)]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">Descripción / Motivo:</span>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            {cleanDescription}
          </p>
        </div>
      </div>

      {/* Operador que Tomó la Emergencia */}
      <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[22px] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            <UserCog size={14} className="text-[#0EA5E9]" />
            <span>Operador Responsable de Despacho</span>
          </div>
          <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#0EA5E9]/12 border border-[#0EA5E9]/25 text-[#0EA5E9] font-mono">
            {operator.status || 'En Turno'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 liquid-input-chamber rounded-[18px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0EA5E9]/14 border border-[#0EA5E9]/30 flex items-center justify-center font-bold text-[#0EA5E9] text-sm shadow-sm">
              {operator.fullName.charAt(0)}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">{operator.fullName}</h4>
              <p className="text-xs text-[#0EA5E9] font-medium">{operator.consoleStation}</p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                Cédula: {operator.cedula} • {operator.shift}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs font-mono">
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold">Consola Enlazada</div>
            <div className="text-[11px] text-[var(--text-muted)]">{operator.email}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

