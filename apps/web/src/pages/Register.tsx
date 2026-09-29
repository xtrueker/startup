import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Smartphone, Lock, ArrowLeft, CheckCircle2, UserCheck, ShieldAlert } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.9),rgba(2,6,23,1))]" />
      
      {/* Subtle Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="relative z-10 max-w-4xl w-full my-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck size={14} /> Protocolo de Seguridad & Verificación de Identidad
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            Red Ciudadana de Seguridad
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Por estrictos protocolos anti-sabotaje y control de acceso, los registros se gestionan según el tipo de participante.
          </p>
        </div>

        {/* 2 Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Ciudadanos */}
          <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5">
                <Smartphone size={26} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                ¿Eres Ciudadano?
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Para evitar cuentas falsas o sabotajes en las alertas, el registro ciudadano exige **verificación de identidad biométrica tipo bancario (KYC)**.
              </p>

              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 mb-6">
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>Captura fotográfica de <strong>Cédula de Ciudadanía</strong> (frente y reverso).</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Prueba biométrica de vida</strong> con selfie facial en cámara frontal.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>Activación de botón de pánico SOS y modo fantasma sigiloso.</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-5">
              <p className="text-xs text-cyan-400 font-semibold mb-3 flex items-center gap-1.5">
                📱 Realiza tu registro directamente en la App Móvil:
              </p>
              <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-lg p-3 text-center">
                <span className="text-xs text-slate-200 block">
                  Abre la aplicación <strong>Expo Go</strong> o instala la app en tu teléfono Android / iOS y toca <strong>"Regístrate"</strong>.
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Operadores y Autoridades */}
          <div className="bg-slate-900/80 border border-indigo-500/20 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-5">
                <Lock size={26} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                ¿Operador o Autoridad?
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                El acceso al **Centro de Mando y Despacho Táctico** es de carácter restringido y de uso exclusivo institucional.
              </p>

              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 mb-6">
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <UserCheck size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <span>Cuentas asignadas institucionalmente por la Dirección de Seguridad.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>No se permite autoregistro público en este terminal web.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <span>Monitoreo de cámaras en vivo y despacho de patrullas policiales.</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-5">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <span>Acceder al Inicio de Sesión</span>
              </button>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Regresar a la pantalla de ingreso
          </button>
        </div>
      </div>
    </div>
  );
}
