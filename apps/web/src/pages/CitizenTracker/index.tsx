import { useState } from 'react';
import { Search, CheckCircle, Info, Sun, Moon } from 'lucide-react';
import { AlertTimeline } from '../../components/CommandCenter/AlertTimeline';
import { useThemeStore } from '../../stores/useThemeStore';
import {
  AmbientPrismCanvas,
  LiquidGlassCard,
  LiquidInput,
  LiquidPillButton,
  PrismEmblem,
  StatusPill,
} from '../../components/ui/LiquidPrimitives';

export default function CitizenTracker() {
  const [trackingId, setTrackingId] = useState('');
  const [searchedId, setSearchedId] = useState('');
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center pt-10 pb-16 px-4 font-sans overflow-y-auto">
      <AmbientPrismCanvas intensity="normal" />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-5">
        {/* Top bar */}
        <div className="liquid-glass-strong rounded-full px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PrismEmblem size={34} />
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              Red Ciudadana
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Tema Perla Claro' : 'Tema Obsidiana'}
              className="w-8 h-8 rounded-full glass-button flex items-center justify-center p-0"
            >
              {theme === 'dark' ? (
                <Sun size={14} className="text-amber-400" />
              ) : (
                <Moon size={14} className="text-sky-600" />
              )}
            </button>
            <StatusPill label="Seguimiento" tone="aqua" />
          </div>
        </div>

        <LiquidGlassCard strong className="p-7">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Seguimiento de reporte
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1.5 leading-relaxed">
              Consulta el estado operativo de tu alerta ciudadana en tiempo real.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <LiquidInput
              label="Código de seguimiento"
              type="text"
              placeholder="Ej: d8a7b-39cf-..."
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              leftIcon={<Search size={16} />}
            />

            <LiquidPillButton
              variant="obsidian"
              size="md"
              onClick={() => setSearchedId(trackingId)}
              disabled={trackingId.length < 5}
              className="w-full"
            >
              <Search size={16} />
              <span>Consultar reporte</span>
            </LiquidPillButton>
          </div>

          {searchedId && (
            <div className="mt-7 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 text-teal-800 dark:text-emerald-300 font-semibold text-sm mb-4 bg-emerald-500/12 px-4 py-3 rounded-[18px] border border-emerald-500/30">
                <CheckCircle size={18} className="text-[#10B981] shrink-0" />
                <span>Reporte encontrado en el sistema</span>
              </div>

              <div className="bg-[var(--bg-input)] rounded-[20px] p-5 border border-[var(--border-strong)]">
                <AlertTimeline alertId={searchedId} />
              </div>

              <p className="text-[11px] text-[var(--text-muted)] mt-4 text-center flex items-center justify-center gap-1.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] p-2.5 rounded-[14px]">
                <Info size={14} className="text-[#0EA5E9] shrink-0" />
                <span>
                  Por seguridad de la investigación, ciertas notas operativas policiales permanecen ocultas.
                </span>
              </p>
            </div>
          )}
        </LiquidGlassCard>
      </div>
    </div>
  );
}
