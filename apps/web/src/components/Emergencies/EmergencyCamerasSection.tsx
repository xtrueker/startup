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
        <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
          <Cctv size={14} className="text-cyan-400" />
          <span>Cámaras dentro del radio perimetral inmediato</span>
        </span>
        <span className="text-xs text-zinc-500 font-mono">Ordenadas por proximidad</span>
      </div>

      {cameras.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-500 bg-[#141416] rounded-xl border border-zinc-800">
          No hay cámaras registradas en la base de datos para este cuadrante inmediato.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cameras.map((cam) => (
            <div
              key={cam.id}
              className="bg-[#141416] border border-zinc-800 hover:border-cyan-800/60 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
                    <Cctv size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-cyan-300 transition-colors">
                      {stripEmojis(cam.name)}
                    </h4>
                    <p className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                      {stripEmojis(cam.location?.address) || 'Ubicación registrada'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-cyan-950/30 text-cyan-300 border border-cyan-800/40 shrink-0 font-mono">
                  a {cam.distanceMeters} m
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-zinc-800/80 font-mono">
                <span className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Señal Activa
                </span>
                <span className="text-zinc-500 truncate max-w-[140px]">
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

