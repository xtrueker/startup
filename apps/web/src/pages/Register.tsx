import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Smartphone,
  Lock,
  ArrowLeft,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useThemeStore } from '../stores/useThemeStore';
import {
  AmbientPrismCanvas,
  LiquidGlassCard,
  LiquidPillButton,
  PrismEmblem,
  StatusPill,
} from '../components/ui/LiquidPrimitives';

export default function Register() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-5 overflow-y-auto font-sans select-none">
      <AmbientPrismCanvas intensity="normal" />

      <div className="relative z-10 w-full max-w-4xl flex flex-col gap-6 my-8">
        {/* Top Floating Nav Pill */}
        <div className="liquid-glass-strong rounded-full px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <PrismEmblem size={36} />
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
            <StatusPill label="Protocolo KYC activo" tone="aqua" />
          </div>
        </div>

        {/* Hero Heading */}
        <div className="text-center px-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
            Acceso y Registro Institucional
          </h1>
          <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Para prevenir cuentas falsas o sabotajes, el ingreso y registro se gestionan según el perfil del participante.
          </p>
        </div>

        {/* 2 Liquid Glass Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Ciudadanos */}
          <LiquidGlassCard strong className="p-7 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/12 border border-sky-500/30 flex items-center justify-center text-[#0EA5E9]">
                  <Smartphone size={24} />
                </div>
                <StatusPill label="App Móvil" tone="aqua" />
              </div>

              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
                ¿Eres ciudadano?
              </h2>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
                El registro ciudadano requiere{' '}
                <strong className="text-[var(--text-primary)]">
                  verificación biométrica de identidad (KYC)
                </strong>{' '}
                desde la cámara de tu teléfono.
              </p>

              <div className="space-y-3 bg-[var(--bg-input)] p-4 rounded-[20px] border border-[var(--border-strong)] mb-6">
                <div className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                  <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
                  <span>
                    Captura fotográfica de{' '}
                    <strong className="text-[var(--text-primary)]">Cédula de Ciudadanía</strong>{' '}
                    (frente y reverso).
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                  <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[var(--text-primary)]">Prueba biométrica de vida</strong>{' '}
                    con selfie facial en vivo.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                  <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
                  <span>Activación de botón SOS y modo fantasma silencioso.</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-5">
              <p className="text-xs text-[#0EA5E9] font-semibold mb-2.5 flex items-center gap-1.5">
                <ShieldCheck size={14} /> Realiza tu registro directamente en la App Móvil
              </p>
              <div className="bg-sky-500/10 border border-sky-500/25 rounded-[18px] p-3.5 text-center">
                <span className="text-xs text-[var(--text-secondary)] leading-relaxed block">
                  Abre <strong className="text-[var(--text-primary)]">Red Ciudadana Móvil</strong>{' '}
                  en Android o iOS y selecciona{' '}
                  <strong className="text-[var(--text-primary)]">"Crear cuenta"</strong>.
                </span>
              </div>
            </div>
          </LiquidGlassCard>

          {/* Card 2: Operadores y Autoridades */}
          <LiquidGlassCard strong className="p-7 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--text-primary)]">
                  <Lock size={24} />
                </div>
                <StatusPill label="Solo personal" tone="neutral" />
              </div>

              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
                ¿Operador o autoridad?
              </h2>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
                El acceso al{' '}
                <strong className="text-[var(--text-primary)]">
                  Centro de Mando y Despacho Táctico
                </strong>{' '}
                es de carácter restringido e institucional.
              </p>

              <div className="space-y-3 bg-[var(--bg-input)] p-4 rounded-[20px] border border-[var(--border-strong)] mb-6">
                <div className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                  <UserCheck size={16} className="text-[#0EA5E9] shrink-0 mt-0.5" />
                  <span>Cuentas asignadas por la Dirección de Seguridad.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                  <ShieldAlert size={16} className="text-[#D97706] shrink-0 mt-0.5" />
                  <span>No se permite autoregistro público en esta terminal web.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                  <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
                  <span>Monitoreo CCTV en vivo y despacho de unidades de patrulla.</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-5">
              <LiquidPillButton
                variant="obsidian"
                size="lg"
                onClick={() => navigate('/login')}
                className="w-full"
              >
                <span>Acceder al inicio de sesión</span>
                <ArrowRight size={16} />
              </LiquidPillButton>
            </div>
          </LiquidGlassCard>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <LiquidPillButton
            variant="glass"
            size="sm"
            onClick={() => navigate('/login')}
          >
            <ArrowLeft size={14} />
            <span>Regresar al ingreso</span>
          </LiquidPillButton>
        </div>
      </div>
    </div>
  );
}
