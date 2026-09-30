import { useState } from 'react';
import { authService } from '../services/auth';
import {
  ShieldAlert,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Radio,
  AlertCircle
} from 'lucide-react';
import './Login.css';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        authService.setToken(response.data.token, response.data.user.id, response.data.user.role);
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
    <div className="relative min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-4 overflow-hidden select-none text-[#f5f5f5]">

      {/* Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:24px_24px] opacity-35 pointer-events-none" />

      {/* Ambient Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#1f2937]/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#18181b]/50 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md z-10">

        {/* Glow Border Container */}
        <div className="relative rounded-2xl bg-gradient-to-b from-[#262626] via-[#1a1a1a] to-[#0a0a0a] p-[1px] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">

          <div className="rounded-2xl bg-[#121212] p-8 sm:p-10 flex flex-col gap-6 border border-[#262626]">

            {/* Header: System Badge & Logo */}
            <div className="flex flex-col items-center text-center gap-3">

              {/* Tactical Status Pill: Muted Sage */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#064e3b]/30 border border-[#065f46]/40 text-[#6ee7b7] text-[11px] font-mono font-bold tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
                </span>
                <Radio size={12} className="text-[#34d399]" />
                CONEXIÓN SEGURA // NODO TÁCTICO
              </div>

              {/* Icon Emblem */}
              <div className="relative mt-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#262626] to-[#141414] flex items-center justify-center shadow-lg border border-[#333333]">
                  <ShieldAlert size={32} className="text-[#fb7185] drop-shadow-sm" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                  Central de Despacho
                </h1>
                <p className="text-xs text-[#a3a3a3] mt-1 font-medium">
                  Red Ciudadana de Seguridad & Control Operativo
                </p>
              </div>
            </div>


            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#4c0519]/40 border border-[#881337]/50 text-[#fda4af] text-xs font-medium animate-in fade-in duration-200">
                <AlertCircle size={16} className="text-[#f43f5e] flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Field: Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] flex items-center gap-1.5">
                  <Mail size={12} className="text-[#818cf8]" />
                  Correo Operativo
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="operador@redciudadana.org"
                    className="w-full bg-[#0d0d0d] border border-[#262626] hover:border-[#3a3a3a] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 rounded-xl px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#525252] transition-all outline-none font-mono"
                  />
                </div>
              </div>

              {/* Field: Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] flex items-center gap-1.5">
                  <Lock size={12} className="text-[#818cf8]" />
                  Contraseña Táctica
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-[#0d0d0d] border border-[#262626] hover:border-[#3a3a3a] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 rounded-xl px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#525252] transition-all outline-none pr-11 font-mono"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="login-submit-btn mt-2 relative group w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-[0_4px_18px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer tracking-wider uppercase"
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
            <div className="flex flex-col items-center gap-3 pt-2 border-t border-[#262626] text-center">
              <p className="text-xs text-[#a3a3a3]">
                ¿Nuevo operador en el sistema?{' '}
                <a
                  href="/register"
                  className="font-semibold text-[#d4d4d4] hover:text-white transition-colors underline underline-offset-2"
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

    </div>
  );
}