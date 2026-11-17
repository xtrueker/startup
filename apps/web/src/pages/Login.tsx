import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth';
import { useThemeStore } from '../stores/useThemeStore';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Check,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import {
  AmbientPrismCanvas,
  LiquidGlassCard,
  LiquidInput,
  LiquidPillButton,
  PrismEmblem,
  StatusPill,
} from '../components/ui/LiquidPrimitives';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const { theme, toggleTheme } = useThemeStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password recovery modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Load saved credentials on mount if user previously selected "Recordar contraseña"
  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem('central_remember_me') === 'true';
      if (savedRemember) {
        setRememberMe(true);
        const savedEmail = localStorage.getItem('central_saved_email');
        const savedPassword = localStorage.getItem('central_saved_password');
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) {
          try {
            setPassword(atob(savedPassword));
          } catch {
            setPassword(savedPassword);
          }
        }
      }
    } catch (e) {
      console.warn('Error reading saved credentials:', e);
    }
  }, []);

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSuccess(true);
    }, 700);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo electrónico y contraseña para continuar.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.login({ email: email.trim().toLowerCase(), password });

      if (response.success && response.data) {
        if (rememberMe) {
          localStorage.setItem('central_remember_me', 'true');
          localStorage.setItem('central_saved_email', email);
          localStorage.setItem('central_saved_password', btoa(password));
        } else {
          localStorage.removeItem('central_remember_me');
          localStorage.removeItem('central_saved_email');
          localStorage.removeItem('central_saved_password');
        }

        authService.setToken(
          response.data.token,
          response.data.user.id,
          response.data.user.role,
          response.data.user.ciudad
        );
        onLogin();
      } else {
        setError(response.message || 'No pudimos iniciar sesión');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Credenciales inválidas o servicio temporalmente no disponible.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-5 overflow-y-auto font-sans select-none">
      <AmbientPrismCanvas intensity="normal" />

      <div className="relative z-10 w-full max-w-[470px] flex flex-col gap-5 my-auto">
        {/* Top Sculpted Studio Bar (Identical to mobile LoginScreen) */}
        <div className="liquid-glass-strong rounded-full px-3.5 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 pl-0.5">
            <PrismEmblem size={36} />
            <div className="flex flex-col">
              <span className="text-[15px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                Red Ciudadana
              </span>
              <span className="text-[10.5px] font-medium text-[var(--text-muted)] leading-none">
                Central de Despacho
              </span>
            </div>
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
            <StatusPill label="Conectado" tone="emerald" pulsing />
          </div>
        </div>

        {/* Center Floating Frosted Liquid Glass Card */}
        <LiquidGlassCard strong className="px-7 py-8 sm:px-8 sm:py-9">
          <div className="text-center mb-7">
            <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)] leading-tight mb-2">
              Bienvenido de nuevo
            </h1>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] max-w-[340px] mx-auto">
              Monitoreo operativo y respuesta inmediata, diseñados para coordinar la seguridad con calma y claridad.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-[18px] px-3.5 py-3 mb-5 text-[13px] font-medium animate-in fade-in duration-150">
              <AlertCircle size={17} className="text-[#E11D48] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <LiquidInput
              label="Correo operativo"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              required
              placeholder="operador@redciudadana.org"
              leftIcon={<Mail size={16} />}
            />

            <LiquidInput
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              required
              placeholder="Ingresa tu contraseña"
              leftIcon={<Lock size={16} />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-0.5 cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              }
            />

            {/* Recordar & Recuperar */}
            <div className="flex items-center justify-between text-xs px-1 py-0.5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <span
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                    rememberMe
                      ? 'bg-[#0EA5E9] border-[#0EA5E9] text-white shadow-xs'
                      : 'bg-[var(--bg-input)] border-[var(--border-strong)] group-hover:border-[#0EA5E9]/60'
                  }`}
                >
                  {rememberMe && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="text-[12px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] font-medium">
                  Recordar contraseña
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotModal(true);
                  setForgotSuccess(false);
                }}
                className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[#0EA5E9] transition-colors"
              >
                ¿Olvidaste tu clave?
              </button>
            </div>

            <LiquidPillButton
              type="submit"
              variant="obsidian"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  <span>Autenticando operador...</span>
                </>
              ) : (
                <>
                  <span>Iniciar sesión</span>
                  <ArrowRight size={17} />
                </>
              )}
            </LiquidPillButton>
          </form>

          {/* Footer Row */}
          <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-[var(--border-subtle)]">
            <span className="text-[13px] text-[var(--text-secondary)]">
              ¿Primera vez en la red?
            </span>
            <Link to="/register" className="no-underline">
              <LiquidPillButton type="button" variant="glass" size="sm">
                <span>Acceso y registro</span>
                <ArrowRight size={14} />
              </LiquidPillButton>
            </Link>
          </div>
        </LiquidGlassCard>
      </div>

      {/* ── MODAL: RECUPERACIÓN DE CONTRASEÑA ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <LiquidGlassCard strong className="w-full max-w-md p-6 sm:p-7">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full glass-button flex items-center justify-center p-0"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <PrismEmblem size={42} />
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                  Recuperar contraseña
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Restablecimiento de credencial operativa
                </p>
              </div>
            </div>

            {forgotSuccess ? (
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-[20px] bg-emerald-500/12 border border-emerald-500/30 text-teal-800 dark:text-emerald-300 text-xs leading-relaxed flex items-start gap-3">
                  <Check size={18} className="text-[#10B981] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Solicitud registrada con éxito</p>
                    <p className="mt-1 opacity-90">
                      Si el correo <span className="font-mono font-semibold">{forgotEmail}</span> pertenece a un operador habilitado, el administrador de turno enviará las credenciales temporales.
                    </p>
                  </div>
                </div>

                <LiquidPillButton
                  type="button"
                  variant="obsidian"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full"
                >
                  Regresar al inicio de sesión
                </LiquidPillButton>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Ingresa tu correo operativo para solicitar el restablecimiento de acceso ante el administrador de sala.
                </p>

                <LiquidInput
                  label="Correo operativo"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  placeholder="operador@redciudadana.org"
                  leftIcon={<Mail size={16} />}
                />

                <div className="flex gap-2.5 pt-2">
                  <LiquidPillButton
                    type="button"
                    variant="glass"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </LiquidPillButton>
                  <LiquidPillButton
                    type="submit"
                    variant="obsidian"
                    loading={forgotLoading}
                    className="flex-1"
                  >
                    {forgotLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      'Enviar solicitud'
                    )}
                  </LiquidPillButton>
                </div>
              </form>
            )}
          </LiquidGlassCard>
        </div>
      )}
    </div>
  );
}
