import React, { useState, useEffect } from 'react';
import { Volume2, Play, Pause, FileText } from 'lucide-react';
import type { Alert as ApiAlert } from '../../services/alerts';
import { stripEmojis, type AssignedOperatorInfo, type AssignedTeamInfo } from './types';

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
      <div className="bg-[#141416] border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            <Volume2 size={14} className="text-violet-400" />
            <span>Evidencia Acústica / Registro de Audio</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">Canal Encriptado • 44.1 kHz</span>
        </div>

        <div className="p-4 bg-[#0f0f11] border border-zinc-800/80 rounded-xl space-y-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlayingAudio(v => !v)}
              className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              {isPlayingAudio ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
            </button>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>{isPlayingAudio ? 'Reproduciendo registro de audio...' : 'Registro capturado al activar alerta'}</span>
                <span className="text-blue-400 font-semibold">{audioProgress}%</span>
              </div>
              {/* Barra de progreso */}
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Simulación visual de onda */}
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
                    isPlayingAudio ? 'bg-blue-400' : 'bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Bitácora Forense y Registro de Sucesos */}
      <div className="bg-[#141416] border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
          <FileText size={14} className="text-blue-400" />
          <span>Línea de Tiempo y Trazabilidad Forense</span>
        </div>

        <div className="space-y-3 border-l border-zinc-800 ml-2 pl-4 text-xs font-mono">
          <div className="relative">
            <span className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-rose-500 shadow-sm" />
            <div className="text-zinc-100 font-semibold">1. Disparo de Alerta Ciudadana</div>
            <div className="text-[11px] text-zinc-400">
              {new Date(alert.createdAt).toLocaleString('es-ES')} - Coordenadas fijadas vía GPS y canal abierto.
            </div>
          </div>

          <div className="relative pt-1">
            <span className="absolute -left-[21px] top-2 w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
            <div className="text-zinc-100 font-semibold">2. Enlace con Operador de Sala</div>
            <div className="text-[11px] text-zinc-400">
              Operador <span className="text-blue-300 font-semibold">{stripEmojis(operator.fullName)}</span> ({operator.consoleStation}) tomó el incidente e inició verificación.
            </div>
          </div>

          <div className="relative pt-1">
            <span className="absolute -left-[21px] top-2 w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
            <div className="text-zinc-100 font-semibold">3. Despacho y Asignación de Unidad Móvil</div>
            <div className="text-[11px] text-zinc-400">
              <span className="text-emerald-300 font-semibold">{stripEmojis(team.teamName)}</span> (Móvil Placa: <span className="text-amber-300 font-semibold">{team.mainVehiclePlate}</span>) en ruta con {team.members.length} efectivos.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

