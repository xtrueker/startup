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
        <div className="bg-[#141416] border border-zinc-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Estado Operativo</span>
          <div className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="capitalize">{alert.status || 'Activa en Despacho'}</span>
          </div>
        </div>

        <div className="bg-[#141416] border border-zinc-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Hora de Activación</span>
          <div className="text-sm font-semibold text-zinc-200 font-mono flex items-center gap-2">
            <Clock size={13} className="text-sky-400" />
            <span>{new Date(alert.createdAt).toLocaleTimeString('es-ES')}</span>
          </div>
        </div>

        <div className="bg-[#141416] border border-zinc-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Prioridad Táctica</span>
          <div className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <Activity size={13} className="text-red-400" />
            <span>Prioridad Alta</span>
          </div>
        </div>
      </div>

      {/* Ubicación y Coordenadas */}
      <div className="bg-[#141416] border border-zinc-800 rounded-xl p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">
          <MapPin size={14} className="text-sky-400" />
          <span>Ubicación y Coordenadas del Incidente</span>
        </div>
        <p className="text-sm font-medium text-zinc-100">
          {stripEmojis(alert.location?.address) || 'Dirección no nominal / Coordenadas fijadas en vivo'}
        </p>
        <div className="text-xs font-mono text-zinc-400 flex items-center gap-4">
          <span>Latitud: <span className="text-sky-300 font-semibold">{alertLat.toFixed(6)}</span></span>
          <span>Longitud: <span className="text-sky-300 font-semibold">{alertLng.toFixed(6)}</span></span>
        </div>
        <div className="pt-2.5 border-t border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Descripción / Motivo:</span>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
            {cleanDescription}
          </p>
        </div>
      </div>

      {/* Operador que Tomó la Emergencia */}
      <div className="bg-[#141416] border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            <UserCog size={14} className="text-blue-400" />
            <span>Operador Responsable de Despacho</span>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-950/40 border border-blue-800/50 text-blue-300 font-mono">
            {operator.status || 'En Turno'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 bg-[#0f0f11] border border-zinc-800/70 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-950/50 border border-blue-800/50 flex items-center justify-center font-bold text-blue-300 text-sm shadow-sm">
              {operator.fullName.charAt(0)}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-100">{operator.fullName}</h4>
              <p className="text-xs text-blue-400 font-medium">{operator.consoleStation}</p>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                Cédula: {operator.cedula} • {operator.shift}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs font-mono">
            <div className="text-emerald-400 font-semibold">Consola Enlazada</div>
            <div className="text-[11px] text-zinc-500">{operator.email}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

