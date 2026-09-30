import { useState, useEffect } from 'react';
import { authService } from '../services/auth';
import {
  ShieldAlert,
  ShieldCheck,
  Bell,
  Users,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Check,
  KeyRound,
  X
} from 'lucide-react';
import './Login.css';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
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
      setError('Por favor complete todos los campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.login({ email, password });

      if (response.success && response.data) {
        // Handle Remember Password preference
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
        setError(response.message || 'Error al iniciar sesión');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Credenciales inválidas o servidor no disponible'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#050505] overflow-hidden select-none text-[#f5f5f5]">

      {/* Cinematic Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url('/bg-login.png')` }}
      />

      {/* Very subtle ambient tint to keep full brightness and detail of camera & CCTV screens */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* ── LEFT BRANDING SECTION: Anchored on the left under ceiling camera ── */}
      <div className="hidden lg:flex flex-col gap-7 w-[350px] xl:w-[380px] absolute left-8 xl:left-16 2xl:left-24 top-1/2 -translate-y-1/2 z-10 text-left">

        {/* Logo & Main Title */}
        <div className="flex items-center gap-4">
          {/* Official App Logo */}
          <div className="flex-shrink-0">
            <img 
              src="/logo.png" 
              alt="Logo Red Ciudadana" 
              className="w-20 h-20 object-contain filter drop-shadow-[0_0_18px_rgba(56,101,246,0.5)]" 
            />
          </div>

          {/* Typography */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase leading-none font-sans">
              Central de<br />Despacho
            </h1>
            <p className="text-xs sm:text-sm text-[#9ca3af] mt-1.5 font-medium leading-tight">
              Red Ciudadana de Seguridad<br />& Control Operativo
            </p>
          </div>
        </div>

        {/* Accent Line matching Form Palette */}
        <div className="w-10 h-[2.5px] bg-[#3865f6] rounded-full shadow-[0_0_10px_rgba(56,101,246,0.6)]" />

        {/* 3 Pillars / Feature Highlights - Clean standalone icons matching reference */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-sm">
          {/* Feature 1 */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center justify-center text-[#3865f6] filter drop-shadow-[0_0_10px_rgba(56,101,246,0.4)]">
              <ShieldCheck size={26} strokeWidth={2.2} />
            </div>
            <span className="text-[11px] text-[#cbd5e1] font-medium leading-tight">
              Monitoreo<br />en tiempo real
            </span>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center justify-center text-[#3865f6] filter drop-shadow-[0_0_10px_rgba(56,101,246,0.4)]">
              <Bell size={26} strokeWidth={2.2} />
            </div>
            <span className="text-[11px] text-[#cbd5e1] font-medium leading-tight">
              Respuesta<br />inmediata
            </span>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center justify-center text-[#3865f6] filter drop-shadow-[0_0_10px_rgba(56,101,246,0.4)]">
              <Users size={26} strokeWidth={2.2} />
            </div>
            <span className="text-[11px] text-[#cbd5e1] font-medium leading-tight">
              Seguridad<br />para todos
            </span>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="flex items-center gap-3 pt-4 text-[10px] sm:text-[11px] tracking-[0.18em] font-mono text-[#9ca3af] uppercase">
          <span className="w-8 h-[2px] bg-[#3865f6] rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(56,101,246,0.6)]" />
          <span className="leading-relaxed">
            Vigilancia inteligente,<br /> comunidades más seguras
          </span>
        </div>

      </div>

      {/* ── CENTER LOGIN CARD: Dead-center of the entire viewport ── */}
      <div className="relative min-h-screen w-full flex items-center justify-center p-4 z-20 pointer-events-auto">
        <div className="w-full max-w-[430px]">

          <div className="rounded-2xl bg-[#111112]/95 backdrop-blur-xl p-8 sm:p-9 flex flex-col gap-6 border border-[#262626] shadow-[0_25px_60px_rgba(0,0,0,0.85)]">

            {/* Card Header: Emblem & Subtitle */}
            <div className="flex flex-col items-center text-center gap-2.5">
              {/* App Logo */}
              <div className="w-26 h-36 rounded-2xl bg-[#141416]/90 border border-[#262626] flex items-center justify-center shadow-lg p-2.5 relative">
                <img 
                  src="/logo.png" 
                  alt="Logo Red Ciudadana" 
                  className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(56,101,246,0.4)]"
                />
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Central de Despacho
                </h2>
                <p className="text-[11px] text-[#9ca3af] mt-0.5 font-medium">
                  Red Ciudadana de Seguridad & Control Operativo
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#4c0519]/40 border border-[#881337]/50 text-[#fda4af] text-xs font-medium animate-in fade-in duration-200">
                <AlertCircle size={16} className="text-[#f43f5e] flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Field: Correo Operativo */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] flex items-center gap-1.5">
                  <Mail size={12} className="text-[#9ca3af]" />
                  Correo Operativo
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="operador@redciudadana.org"
                    className="w-full bg-[#181819] border border-[#2a2a2b] hover:border-[#38383a] focus:border-[#3865f6] focus:ring-1 focus:ring-[#3865f6]/25 rounded-xl px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#525252] transition-all outline-none font-mono"
                  />
                </div>
              </div>

              {/* Field: Contraseña Táctica */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] flex items-center gap-1.5">
                  <Lock size={12} className="text-[#9ca3af]" />
                  Contraseña Táctica
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-[#181819] border border-[#2a2a2b] hover:border-[#38383a] focus:border-[#3865f6] focus:ring-1 focus:ring-[#3865f6]/25 rounded-xl px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#525252] transition-all outline-none pr-11 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#e5e5e5] transition-colors p-1"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Recordar Contraseña & Recuperar Contraseña */}
              <div className="flex items-center justify-between text-xs py-0.5 select-none">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                      rememberMe 
                        ? 'bg-[#3865f6] border-[#3865f6] text-white shadow-[0_0_8px_rgba(56,101,246,0.5)]' 
                        : 'bg-[#181819] border-[#2a2a2b] group-hover:border-[#3865f6]/50'
                    }`}>
                      {rememberMe && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                  <span className="text-[11px] text-[#9ca3af] group-hover:text-[#d1d5db] transition-colors font-medium">
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
                  className="text-[11px] font-medium text-[#9ca3af] hover:text-[#3865f6] transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Submit Button: Strictly #0e1c62 */}
              <button
                type="submit"
                disabled={loading}
                className="login-submit-btn mt-2 relative group w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-[#0e1c62] hover:bg-[#162a8c] border border-[#1d36a8] shadow-[0_4px_20px_rgba(14,28,98,0.55)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer tracking-wider uppercase"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Autenticando Operador...</span>
                  </>
                ) : (
                  <>
                    <span>Acceder a la Central</span>
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="flex flex-col items-center gap-2.5 pt-2 border-t border-[#262626] text-center">
              <p className="text-xs text-[#a3a3a3]">
                ¿Nuevo operador en el sistema?{' '}
                <a
                  href="/register"
                  className="font-semibold text-white hover:text-[#5266d6] transition-colors underline underline-offset-2"
                >
                  Registrar Agente
                </a>
              </p>

              <div className="text-[10px] font-mono text-[#525252] uppercase tracking-widest">
                AES-256 GCM • PROTOCOLO SEGURO EN VIVO
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ── MODAL: RECUPERACIÓN DE CONTRASEÑA ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-[#111112] border border-[#262626] p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col gap-5 text-left">
            {/* Close Button */}
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#141416] border border-[#2a2a2b] flex items-center justify-center p-2 shadow-md flex-shrink-0">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wide">
                  Recuperar Contraseña
                </h3>
                <p className="text-[11px] text-[#9ca3af]">
                  Restablecimiento de credencial operativa
                </p>
              </div>
            </div>

            {forgotSuccess ? (
              <div className="flex flex-col gap-4 py-2">
                <div className="p-4 rounded-xl bg-[#064e3b]/30 border border-emerald-500/40 text-emerald-300 text-xs leading-relaxed flex items-start gap-3">
                  <Check size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-200 text-sm">Solicitud registrada con éxito</p>
                    <p className="text-[11px] text-emerald-400/90 mt-1">
                      Si el correo <span className="text-white font-mono">{forgotEmail}</span> pertenece a un operador habilitado, el administrador de turno enviará las credenciales temporales o restablecerá el acceso a la central.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-3 rounded-xl bg-[#181819] hover:bg-[#222225] border border-[#2a2a2b] text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Regresar al Inicio de Sesión
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                <p className="text-xs text-[#9ca3af] leading-relaxed">
                  Ingrese el correo operativo con el que fue dado de alta en la central de seguridad para solicitar el restablecimiento de su clave.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] flex items-center gap-1.5">
                    <Mail size={12} className="text-[#3865f6]" />
                    Correo Operativo
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    placeholder="operador@redciudadana.org"
                    className="w-full bg-[#181819] border border-[#2a2a2b] hover:border-[#38383a] focus:border-[#3865f6] focus:ring-1 focus:ring-[#3865f6]/25 rounded-xl px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#525252] transition-all outline-none font-mono"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-3 rounded-xl bg-[#181819] hover:bg-[#222225] border border-[#2a2a2b] text-xs font-semibold text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-3 rounded-xl bg-[#0e1c62] hover:bg-[#162a8c] border border-[#1d36a8] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_4px_16px_rgba(14,28,98,0.5)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : (
                      'Enviar Solicitud'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}