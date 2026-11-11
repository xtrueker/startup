import React from 'react';
import { useCommandStore } from '../../stores/useCommandStore';

interface PoliceSirenBordersProps {
  active?: boolean;
}

/**
 * PoliceSirenBorders
 * 
 * Efecto de sirena policial con estética neón sutil en los bordes
 * superior, derecho e inferior de la pantalla (excluyendo el lado izquierdo del sidebar).
 * 
 * Se activa ÚNICAMENTE cuando existe al menos una emergencia activa en el sistema.
 */
export const PoliceSirenBorders: React.FC<PoliceSirenBordersProps> = ({ active }) => {
  const activeAlerts = useCommandStore(s => s.activeAlerts);
  
  const hasActiveEmergency = active !== undefined 
    ? active 
    : Object.values(activeAlerts).some(
        alert => alert.status !== 'resolved' && (alert.status as any) !== 'discarded'
      );

  return (
    <div 
      className={`fixed inset-0 pointer-events-none z-20 overflow-hidden select-none transition-opacity duration-700 ${
        hasActiveEmergency ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      {/* ── 1. Borde Superior (Top Edge) ── */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] flex overflow-visible">
        {/* Luz Azul Oscuro (Izquierda / Centro) */}
        <div className="w-[52%] h-full police-neon-tube-blue-h police-neon-strobe-parallel" />
        {/* Luz Roja Carmesí (Centro / Derecha) */}
        <div className="w-[52%] -ml-[4%] h-full police-neon-tube-red-h police-neon-strobe-parallel" />
      </div>

      {/* ── 2. Borde Derecho (Right Edge) ── */}
      <div className="absolute top-0 bottom-0 right-0 w-[1.5px] flex flex-col overflow-visible">
        {/* Luz Azul Oscuro (Mitad Superior) */}
        <div className="h-[52%] w-full police-neon-tube-blue-v police-neon-strobe-parallel" />
        {/* Luz Roja Carmesí (Mitad Inferior) */}
        <div className="h-[52%] -mt-[4%] w-full police-neon-tube-red-v police-neon-strobe-parallel" />
      </div>

      {/* ── 3. Borde Inferior (Bottom Edge) ── */}
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] flex overflow-visible">
        {/* Luz Azul Oscuro (Izquierda / Centro) */}
        <div className="w-[52%] h-full police-neon-tube-blue-h police-neon-strobe-parallel" />
        {/* Luz Roja Carmesí (Centro / Derecha) */}
        <div className="w-[52%] -ml-[4%] h-full police-neon-tube-red-h police-neon-strobe-parallel" />
      </div>
    </div>
  );
};
