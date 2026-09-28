import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog, Plus, Search, ShieldCheck, ArrowLeft } from 'lucide-react';

const AdminOperators: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-[#f5f5f5] p-8 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-9 h-9 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#262626] hover:border-[#404040] flex items-center justify-center text-[#a1a1aa] hover:text-white transition-all mr-1 p-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-[#1e1b4b]/60 border border-[#4f46e5]/40 flex items-center justify-center">
            <UserCog size={20} className="text-[#818cf8]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#efede3] tracking-tight">Operadores</h1>
            <p className="text-xs text-[#737373] font-mono">Gestión de operadores del sistema</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-[#818cf8]/10 hover:bg-[#818cf8]/20 border border-[#4f46e5]/40 hover:border-[#818cf8]/60 text-[#818cf8] px-4 py-2 rounded-lg text-sm font-bold transition-all">
          <Plus size={15} /> Nuevo Operador
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
        <input
          type="text"
          placeholder="Buscar operador..."
          className="w-full bg-[#141414] border border-[#262626] focus:border-[#4f46e5]/60 rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#d4d4d4] placeholder-[#525252] outline-none transition-colors"
        />
      </div>

      {/* Table placeholder */}
      <div className="flex-1 bg-[#111111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1e1e1e] flex items-center gap-2 text-[11px] text-[#525252] uppercase tracking-widest font-bold">
          <ShieldCheck size={12} className="text-[#818cf8]" /> Operadores registrados
        </div>
        <div className="flex flex-col items-center justify-center h-48 text-[#3a3a3a] gap-2">
          <UserCog size={36} strokeWidth={1} />
          <span className="text-xs font-mono">Sin operadores registrados</span>
        </div>
      </div>
    </div>
  );
};

export default AdminOperators;
