import React, { useState, useEffect } from 'react';
import { Volume2, Play, Pause, FileText } from 'lucide-react';
import type { Alert as ApiAlert } from '../../services/alerts';
import type { AssignedOperatorInfo, AssignedTeamInfo } from './types';

interface EmergencyEvidenceSectionProps {
  alert: ApiAlert;
  operator: AssignedOperatorInfo;
  team: AssignedTeamInfo;
}

export const EmergencyEvidenceSection: React.FC<EmergencyEvidenceSectionProps> = ({
  alert,
  operator,
  team,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 4;
        });
      }, 400);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  return (
    <div className="space-y-4">
      {/* Reproductor de Audio de la Alerta */}
      <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[22px] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            <Volume2 size={15} />
            <span>Evidencia Acústica / Micrófono Ciudadano en Tiempo Real</span>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">Canal P2P Encriptado • 44.1 kHz</span>
        </div>

        <div className="p-4 liquid-input-chamber rounded-[18px] space-y-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlayingAudio(v => !v)}
              className="w-10 h-10 rounded-full bg-[#e11d48] hover:bg-[#be123c] text-white flex items-center justify-center transition-transform hover:scale-105 shadow-[0_6px_16px_rgba(225,29,72,0.28)] shrink-0 cursor-pointer"
            >
              {isPlayingAudio ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>

            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
                <span>{isPlayingAudio ? 'Reproduciendo audio del incidente...' : 'Clip de audio capturado al disparar pánico'}</span>
                <span className="font-semibold text-[var(--text-primary)]">{audioProgress}%</span>
              </div>
              {/* Barra de progreso */}
              <div className="w-full h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0EA5E9] to-[#e11d48] rounded-full transition-all duration-300"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Simulación visual de onda táctica */}
          <div className="flex items-center justify-between gap-1 h-8 pt-1">
            {Array.from({ length: 32 }).map((_, i) => {
              const height = isPlayingAudio
                ? Math.max(20, Math.sin((i + audioProgress) * 0.5) * 80 + 30)
                : (i % 3 === 0 ? 30 : i % 2 === 0 ? 55 : 20);
              return (
                <div
                  key={i}
                  style={{ height: `${height}%` }}
                  className={`w-1 rounded-full transition-all duration-200 ${
                    isPlayingAudio ? 'bg-[#f43f5e]' : 'bg-[var(--border-strong)]'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Bitácora Forense y Registro de Sucesos */}
      <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[22px] p-4 space-y-3">
        <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
          <FileText size={14} className="text-[#0EA5E9]" />
          <span>Línea de Tiempo Forense y Trazabilidad</span>
        </div>

        <div className="space-y-3 border-l-2 border-[var(--border-strong)] ml-2 pl-4 text-xs font-mono">
          <div className="relative">
            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
            <div className="text-[var(--text-primary)] font-bold">1. Disparo de Alerta SOS Ciudadana</div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {new Date(alert.createdAt).toLocaleString('es-ES')} - Coordenadas fijadas vía GPS y apertura de canal de audio.
            </div>
          </div>

          <div className="relative pt-1">
            <span className="absolute -left-[21px] top-2 w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" />
            <div className="text-[var(--text-primary)] font-bold">2. Enlace con Operador de Sala</div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Operador {operator.fullName} ({operator.consoleStation}) tomó el incidente e inició verificación perimetral.
            </div>
          </div>

          <div className="relative pt-1">
            <span className="absolute -left-[21px] top-2 w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div className="text-[var(--text-primary)] font-bold">3. Despacho y Asignación de Unidad Móvil</div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {team.teamName} (Móvil Placa: {team.mainVehiclePlate}) notificado y en ruta al sitio con {team.members.length} agentes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
