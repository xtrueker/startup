import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, ArrowLeft } from 'lucide-react';

const AdminUsers: React.FC = () => {
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
        <div className="w-10 h-10 rounded-xl bg-[#064e3b]/50 border border-[#065f46]/40 flex items-center justify-center">
          <Users size={20} className="text-[#34d399]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#efede3] tracking-tight">Equipos</h1>
          <p className="text-xs text-[#737373] font-mono">Gestión de equipos</p>
        </div>
      </div>
      <button className="flex items-center gap-2 bg-[#34d399]/10 hover:bg-[#34d399]/20 border border-[#065f46]/40 hover:border-[#34d399]/50 text-[#34d399] px-4 py-2 rounded-lg text-sm font-bold transition-all">
        <Plus size={15} /> Nuevo Equipo
      </button>
    </div>
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
      <input type="text" placeholder="Buscar usuario..." className="w-full bg-[#141414] border border-[#262626] focus:border-[#065f46]/60 rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#d4d4d4] placeholder-[#525252] outline-none transition-colors" />
    </div>
    <div className="flex-1 bg-[#111111] border border-[#1e1e1e] rounded-xl flex flex-col items-center justify-center gap-2 text-[#3a3a3a]">
      <Users size={36} strokeWidth={1} />
      <span className="text-xs font-mono">Sin equipos registrados</span>
    </div>
  </div>
  );
};

export default AdminUsers;
