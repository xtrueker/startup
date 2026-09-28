import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, AlertTriangle, Clock, Users, ArrowLeft } from 'lucide-react';

const AdminKPI: React.FC = () => {
  const navigate = useNavigate();
  return (
  <div className="flex flex-col h-full bg-[#0a0a0a] text-[#f5f5f5] p-8 gap-6">
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate('/command-center')}
        title="Volver al Centro de Mando"
        className="w-9 h-9 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#262626] hover:border-[#404040] flex items-center justify-center text-[#a1a1aa] hover:text-white transition-all mr-1 p-0"
      >
        <ArrowLeft size={17} />
      </button>
      <div className="w-10 h-10 rounded-xl bg-[#451a03]/50 border border-[#92400e]/40 flex items-center justify-center">
        <BarChart3 size={20} className="text-[#fbbf24]" />
      </div>
      <div>
        <h1 className="text-xl font-black text-[#efede3] tracking-tight">KPI & Reportes</h1>
        <p className="text-xs text-[#737373] font-mono">Métricas operacionales del sistema</p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {[
        { label: 'Tiempo Resp. Promedio', value: '—', sub: 'minutos', Icon: Clock, color: 'text-[#fbbf24]', bg: 'bg-[#451a03]/30 border-[#92400e]/40' },
        { label: 'Alertas Hoy', value: '0', sub: 'total', Icon: AlertTriangle, color: 'text-[#fb7185]', bg: 'bg-[#450a0a]/30 border-[#9f1239]/40' },
        { label: 'Tasa de Resolución', value: '—', sub: '%', Icon: TrendingUp, color: 'text-[#34d399]', bg: 'bg-[#064e3b]/30 border-[#065f46]/40' },
        { label: 'Usuarios Activos', value: '0', sub: 'ciudadanos', Icon: Users, color: 'text-[#818cf8]', bg: 'bg-[#1e1b4b]/30 border-[#4f46e5]/40' },
      ].map(({ label, value, sub, Icon, color, bg }) => (
        <div key={label} className={`${bg} border rounded-xl p-5 flex flex-col gap-3`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#737373] uppercase tracking-widest font-bold">{label}</span>
            <Icon size={16} className={color} />
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-black text-[#efede3]">{value}</span>
            <span className="text-xs text-[#525252] mb-1 font-mono">{sub}</span>
          </div>
        </div>
      ))}
    </div>

    <div className="flex-1 bg-[#111111] border border-[#1e1e1e] rounded-xl flex flex-col items-center justify-center gap-2 text-[#3a3a3a]">
      <BarChart3 size={40} strokeWidth={1} />
      <span className="text-xs font-mono">Gráficas disponibles próximamente</span>
    </div>
  </div>
  );
};

export default AdminKPI;
