import React from 'react';
import { Cctv } from 'lucide-react';
import type { Camera } from '../../services/cameras';
import { stripEmojis } from './types';

interface EmergencyCamerasSectionProps {
  cameras: Array<Camera & { distanceMeters: number }>;
}

export const EmergencyCamerasSection: React.FC<EmergencyCamerasSectionProps> = ({ cameras }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
          <Cctv size={14} className="text-[#0EA5E9]" />
          <span>Cámaras dentro del radio perimetral inmediato</span>
        </span>
        <span className="text-xs text-[var(--text-muted)] font-mono">Ordenadas por proximidad</span>
      </div>

      {cameras.length === 0 ? (
        <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-input)] rounded-[22px] border border-[var(--border-strong)]">
          No hay cámaras registradas en la base de datos para este cuadrante inmediato.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cameras.map((cam) => (
            <div
              key={cam.id}
              className="bg-[var(--bg-input)] border border-[var(--border-strong)] hover:border-[#0EA5E9]/50 rounded-[20px] p-3.5 flex flex-col justify-between gap-3 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#0EA5E9]/12 border border-[#0EA5E9]/25 flex items-center justify-center text-[#0EA5E9] shrink-0 shadow-sm">
                    <Cctv size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[#0EA5E9] transition-colors">
                      {stripEmojis(cam.name)}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[200px]">
                      {stripEmojis(cam.location?.address) || 'Ubicación registrada'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#0EA5E9]/12 text-[#0EA5E9] border border-[#0EA5E9]/25 shrink-0 font-mono">
                  a {cam.distanceMeters} m
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[var(--border-subtle)] font-mono">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Señal Activa
                </span>
                <span className="text-[var(--text-muted)] truncate max-w-[140px]">
                  {cam.streamUrl || 'RTSP Stream'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

