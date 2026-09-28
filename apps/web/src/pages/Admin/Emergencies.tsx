import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Siren, Search, Clock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

const AdminEmergencies: React.FC = () => {
  const navigate = useNavigate();
  return (
  <div className="flex flex-col h-full bg-[#0a0a0a] text-[#f5f5f5] p-8 gap-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/command-center')}
          title="Volver al Centro de Mando"
          className="w-9 h-9 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#262626] hover:border-[#404040] flex items-center justify-center text-[#a1a1aa] hover:text-white transition-all mr-1 p-0"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="w-10 h-10 rounded-xl bg-[#450a0a]/50 border border-[#9f1239]/40 flex items-center justify-center">
          <Siren size={20} className="text-[#fb7185]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#efede3] tracking-tight">Emergencias</h1>
          <p className="text-xs text-[#737373] font-mono">Historial y gestión de emergencias</p>
        </div>
      </div>
    </div>

    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
      <input type="text" placeholder="Buscar por ID, tipo o dirección..." className="w-full bg-[#141414] border border-[#262626] focus:border-[#9f1239]/60 rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#d4d4d4] placeholder-[#525252] outline-none transition-colors" />
    </div>

    <div className="grid grid-cols-3 gap-3">
      {[
        { label: 'Pendientes', value: '0', Icon: Clock, color: 'text-[#fbbf24]', bg: 'bg-[#451a03]/30 border-[#92400e]/40' },
        { label: 'En Revisión', value: '0', Icon: AlertCircle, color: 'text-[#fb7185]', bg: 'bg-[#450a0a]/30 border-[#9f1239]/40' },
        { label: 'Resueltas', value: '0', Icon: CheckCircle2, color: 'text-[#34d399]', bg: 'bg-[#064e3b]/30 border-[#065f46]/40' },
      ].map(({ label, value, Icon, color, bg }) => (
        <div key={label} className={`${bg} border rounded-xl p-4 flex items-center gap-3`}>
          <Icon size={20} className={color} />
          <div><div className="text-xl font-black text-[#efede3]">{value}</div><div className="text-[10px] text-[#737373] uppercase tracking-wider">{label}</div></div>
        </div>
      ))}
    </div>

    <div className="flex-1 bg-[#111111] border border-[#1e1e1e] rounded-xl flex flex-col items-center justify-center gap-2 text-[#3a3a3a]">
      <Siren size={36} strokeWidth={1} />
      <span className="text-xs font-mono">Sin emergencias registradas</span>
    </div>
  </div>
  );
};

export default AdminEmergencies;
