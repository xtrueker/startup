import React from 'react';
import { ShieldAlert, Smartphone, LogOut, QrCode, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../stores/useThemeStore';
import {
  AmbientPrismCanvas,
  LiquidGlassCard,
  LiquidPillButton,
  PrismEmblem,
  StatusPill,
} from '../components/ui/LiquidPrimitives';

interface AccessDeniedProps {
  onLogout: () => void;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ onLogout }) => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-5 overflow-y-auto font-sans">
      <AmbientPrismCanvas intensity="normal" />

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-5 my-auto">
        {/* Top bar */}
        <div className="liquid-glass-strong rounded-full px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PrismEmblem size={36} activeAlert />
            <span className="text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
              Red Ciudadana
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a Tema Perla Claro' : 'Cambiar a Tema Obsidiana'}
              className="w-8 h-8 rounded-full glass-button flex items-center justify-center p-0"
            >
              {theme === 'dark' ? (
                <Sun size={14} className="text-amber-400" />
              ) : (
                <Moon size={14} className="text-sky-600" />
              )}
            </button>
            <StatusPill label="Acceso bloqueado" tone="crimson" />
          </div>
        </div>

        <LiquidGlassCard strong className="p-8 md:p-11 text-center">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/12 border border-rose-500/30 flex items-center justify-center text-[#E11D48] shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
            Acceso restringido
          </h1>
          <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto mb-8">
            Esta terminal web es de uso exclusivo para{' '}
            <strong className="text-[var(--text-primary)]">Operadores</strong> y{' '}
            <strong className="text-[var(--text-primary)]">Supervisores</strong> del Centro de Comando.
            Utiliza la aplicación móvil para reportar incidentes o alertas SOS.
          </p>

          {/* QR & Mobile App Block */}
          <div className="grid md:grid-cols-2 gap-6 items-center bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[22px] p-6 mb-7 text-left">
            <div className="flex flex-col items-center justify-center">
              <div className="p-4 bg-white dark:bg-[#0F141C] border border-[var(--border-strong)] rounded-2xl shadow-sm">
                <QrCode className="w-32 h-32 text-[#0F141C] dark:text-sky-400" />
              </div>
              <span className="text-[11px] text-[var(--text-muted)] mt-3 font-medium">
                Escanear para instalar
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#0EA5E9]" /> Aplicación Móvil
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-5 leading-relaxed">
                Escanea el código QR con la cámara de tu teléfono o accede desde la tienda oficial.
              </p>

              <div className="flex flex-col gap-2.5">
                <LiquidPillButton
                  variant="glass"
                  size="sm"
                  onClick={(e) => e.preventDefault()}
                  className="justify-start px-4"
                >
                  <span>Descargar en App Store</span>
                </LiquidPillButton>
                <LiquidPillButton
                  variant="glass"
                  size="sm"
                  onClick={(e) => e.preventDefault()}
                  className="justify-start px-4"
                >
                  <span>Disponible en Google Play</span>
                </LiquidPillButton>
              </div>
            </div>
          </div>

          <LiquidPillButton variant="crimson" size="lg" onClick={onLogout} className="px-8">
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </LiquidPillButton>
        </LiquidGlassCard>
      </div>
    </div>
  );
};

export default AccessDenied;
