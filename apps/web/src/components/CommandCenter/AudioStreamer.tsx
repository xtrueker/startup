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
    <div className="bg-[var(--bg-input)] p-3 rounded-[18px] flex flex-col gap-2 border border-[var(--border-strong)] text-[var(--text-primary)]">
      <div className="flex justify-between items-center text-xs font-bold text-[var(--text-primary)]">
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0EA5E9] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0EA5E9]"></span>
            </span>
          ) : (
            <Mic size={14} className="text-[var(--text-muted)]" />
          )}
          <span>Evidencia de audio</span>
        </div>
        <div className="text-[10px] font-mono px-2.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-full text-[var(--text-muted)]">
          {queueLength} chunks
        </div>
      </div>

      <div className="h-9 bg-[var(--bg-elevated)] rounded-full flex items-center px-3.5 border border-[var(--border-subtle)]">
        {isPlaying ? (
          <div className="flex items-center gap-2.5 w-full">
            <Volume2 size={15} className="text-[#0EA5E9]" />
            <div className="text-xs text-[var(--text-primary)] font-mono animate-pulse">
              Decodificando transmisión en vivo ({currentUrl?.substring(0, 20)}...)
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-mono">
             <Loader size={13} className="animate-spin text-[#0EA5E9]" /> Esperando paquetes de audio...
          </div>
        )}
      </div>

      {/* HTML5 Audio API */}
      <audio 
        ref={audioRef} 
        onEnded={tryPlayNextChunk} 
        className="hidden" 
        controls={false}
      />
    </div>
  );
};
