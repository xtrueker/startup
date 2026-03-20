import React, { useEffect, useRef, useState } from 'react';
import { useCommandStore } from '../../stores/useCommandStore';
import { Mic, Volume2, Loader } from 'lucide-react';

export const AudioStreamer: React.FC<{ alertId: string }> = ({ alertId }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  // Subscripción selectiva al estado del audio de *solo esta* alerta
  const popAudioChunk = useCommandStore(s => s.popAudioChunk);
  const queueLength = useCommandStore(s => s.audioChunks[alertId]?.length || 0);

  // Motor de Reproducción Continua
  const tryPlayNextChunk = () => {
    const nextUrl = popAudioChunk(alertId);
    if (nextUrl) {
      setCurrentUrl(nextUrl);
    } else {
      setIsPlaying(false);
      setCurrentUrl(null); // Fin del streaming momentáneo
    }
  };

  useEffect(() => {
    // Escuchar cambios: Si no estoy reproduciendo y la cola sube, arrancar.
    if (!isPlaying && queueLength > 0) {
      setIsPlaying(true);
      tryPlayNextChunk();
    }
  }, [queueLength, isPlaying]);

  useEffect(() => {
    if (currentUrl && audioRef.current) {
      audioRef.current.src = currentUrl;
      audioRef.current.play().catch(e => {
        console.warn('Bloqueo del navegador para Autoplay de evidencia táctica.', e);
      });
    }
  }, [currentUrl]);

  return (
    <div className="bg-slate-800 p-3 rounded-md flex flex-col gap-2 border border-slate-700">
      <div className="flex justify-between items-center text-sm font-semibold text-slate-300">
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          ) : (
            <Mic size={14} className="text-slate-500" />
          )}
          Evidencia de Audio "Black-Box"
        </div>
        <div className="text-xs px-2 py-0.5 bg-slate-700 rounded-full">
          {queueLength} Chunks (Buffer)
        </div>
      </div>

      <div className="h-10 bg-slate-900 rounded flex items-center px-4">
        {isPlaying ? (
          <div className="flex items-center gap-3 w-full">
            <Volume2 size={16} className="text-emerald-400" />
            <div className="text-xs text-slate-400 mt-0.5 animate-pulse">
              Decodificando transmisión en vivo ({currentUrl?.substring(0, 20)}...)
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-600 text-xs">
             <Loader size={14} className="animate-spin" /> Esperando paquetes de evidencia...
          </div>
        )}
      </div>

      {/* HTML5 Audio API - Elemento Oculto (Manejado lógicamente) */}
      <audio 
        ref={audioRef} 
        onEnded={tryPlayNextChunk} 
        className="hidden" 
        controls={false}
      />
    </div>
  );
};
