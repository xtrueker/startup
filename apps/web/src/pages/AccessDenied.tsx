import React from 'react';
import { ShieldAlert, Smartphone, LogOut, Cpu, QrCode } from 'lucide-react';

interface AccessDeniedProps {
  onLogout: () => void;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ onLogout }) => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* High-tech Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.8),rgba(2,6,23,1))]" />
      
      {/* Futuristic Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />
      
      {/* Decorative Neon Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div className="relative z-10 max-w-2xl w-full mx-4 p-8 md:p-12 rounded-3xl border border-red-500/20 bg-slate-900/60 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] text-center animate-[fadeIn_0.6s_ease-out]">
        
        {/* Top High-Tech Bracket Decor */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 border border-red-500/30 rounded-full text-[10px] uppercase tracking-[0.2em] text-red-400 font-semibold shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          System Alert // Security Block
        </div>

        {/* Restricted Shield / Warning Header */}
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
            <ShieldAlert className="w-12 h-12 text-red-500 animate-pulse" />
            <div className="absolute inset-0 rounded-2xl border border-red-500/20 animate-ping opacity-30" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2 uppercase">
          Acceso Restringido
        </h1>
        <div className="w-16 h-[2px] bg-red-500/50 mx-auto mb-6" />
        
        <p className="text-base md:text-lg text-slate-300 font-normal leading-relaxed max-w-lg mx-auto mb-10">
          Esta terminal web es de uso exclusivo para{' '}
          <span className="text-indigo-400 font-semibold">Operadores</span> y{' '}
          <span className="text-cyan-400 font-semibold">Supervisores</span> del Centro de Comando.
          Por favor descarga y usa la app móvil para reportar incidentes o alertas.
        </p>

        {/* Interactive QR Code & App Download Section */}
        <div className="grid md:grid-cols-2 gap-8 items-center bg-slate-950/50 border border-slate-800/80 rounded-2xl p-6 md:p-8 mb-8 text-left">
          
          {/* Left Column: QR Code */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-inner group overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
              
              {/* Scanline Animation */}
              <div className="absolute left-0 w-full h-[2px] bg-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-[scan_2.5s_ease-in-out_infinite] pointer-events-none" />

              {/* QR Code Graphic */}
              <div className="w-36 h-36 flex items-center justify-center bg-slate-950 p-2 rounded-lg border border-slate-900">
                <QrCode className="w-full h-full text-slate-400/80 group-hover:text-cyan-400 transition-colors duration-500" />
              </div>
            </div>
            <span className="text-[11px] text-slate-500 uppercase tracking-widest mt-3 font-semibold flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-cyan-500" /> Escanear para Instalar
            </span>
          </div>

          {/* Right Column: Badges & Instructions */}
          <div className="flex flex-col justify-center">
            <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400" /> Aplicación Móvil
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Escanea el código QR con la cámara de tu smartphone o presiona los enlaces para instalar la aplicación oficial.
            </p>

            {/* Badges Stack */}
            <div className="flex flex-col gap-3">
              {/* App Store Mock Badge */}
              <a 
                href="#app-store" 
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all group shadow-sm"
                onClick={(e) => e.preventDefault()}
              >
                <svg className="w-5 h-5 text-white fill-current group-hover:scale-105 transition-transform" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.13-1.92-14.37-6.15-3.43-2.85-7.25-7.58-11.45-14.21-8.99-14.27-13.48-28.77-13.48-43.51 0-15.65 4.34-28.73 13.03-39.25 8.68-10.52 19.1-15.86 31.25-16.02 6.02 0 12.19 1.68 18.51 5.05 6.33 3.37 10.97 5.06 13.93 5.06 3.11 0 7.82-1.74 14.13-5.21 6.31-3.48 12.19-5.11 17.65-4.9 14.13.62 25 5.86 32.61 15.74-11.27 6.84-16.81 16.14-16.63 27.91.19 9.87 3.82 18.06 10.88 24.58 7.07 6.52 15.53 10.05 25.39 10.59-.19 2.59-.87 5.56-2.02 8.92zm-28.91-112.57c0 7.87-2.91 15.14-8.73 21.8-6.13 6.94-13.67 10.93-22.61 10.93-.19-7.97 2.8-15.34 8.96-22.1 6.06-6.68 13.72-10.66 22.38-10.63.19.78.29 1.54.29 2.3z" />
                </svg>
                <div className="text-left">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Descargar en</p>
                  <p className="text-xs font-bold text-white -mt-0.5">App Store</p>
                </div>
              </a>

              {/* Google Play Mock Badge */}
              <a 
                href="#google-play" 
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all group shadow-sm"
                onClick={(e) => e.preventDefault()}
              >
                <svg className="w-5 h-5 text-white fill-current group-hover:scale-105 transition-transform" viewBox="0 0 48 48">
                  <path d="M5.5 4.3v39.4c0 .8.6 1.3 1.3 1.3.4 0 .8-.2 1.1-.4L32 24 7.9 3.5c-.3-.2-.7-.4-1.1-.4-.7 0-1.3.5-1.3 1.2z" className="fill-slate-400 group-hover:fill-cyan-400 transition-colors" />
                  <path d="M32 24L7.9 44.5c.3.2.7.4 1.1.4.5 0 1-.2 1.4-.4l26.2-15c1.4-.8 1.4-2.2 0-3L10.4 11.5c-.4-.2-.9-.4-1.4-.4-.4 0-.8.2-1.1.4L32 24z" className="fill-slate-300 group-hover:fill-white transition-colors" />
                </svg>
                <div className="text-left">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Disponible en</p>
                  <p className="text-xs font-bold text-white -mt-0.5">Google Play</p>
                </div>
              </a>
            </div>

          </div>

        </div>

        {/* Footer Actions: Logout */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 hover:border-slate-600 text-sm font-semibold transition-all shadow-md group text-slate-200"
          >
            <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-500 transition-colors" />
            Cerrar Sesión
          </button>
        </div>

        {/* CSS styles injected for layout-specific keyframes */}
        <style>{`
          @keyframes scan {
            0%, 100% { top: 0%; }
            50% { top: 100%; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

      </div>
    </div>
  );
};

export default AccessDenied;
