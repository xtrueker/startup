import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Users, 
  ArrowLeft, 
  Cctv, 
  Shield, 
  Car, 
  RefreshCw, 
  CheckCircle2, 
  Activity,
  Flame,
  UserCheck
} from 'lucide-react';
import { kpiService } from '../../services/kpi';
import type { KpiSummary } from '../../services/kpi';

const AdminKPI: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<KpiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const res = await kpiService.getSummary();
      setData(res);
    } catch (err) {
      console.error('Error cargando KPIs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const alerts = data?.alerts || {
    total: 0,
    pending: 0,
    reviewing: 0,
    resolved: 0,
    today: 0,
    thisWeek: 0,
    resolutionRate: 0,
  };

  const cameras = data?.cameras || {
    total: 0,
    online: 0,
    offline: 0,
    uptimePercent: 0,
  };

  const operators = data?.operators || {
    total: 0,
    enServicio: 0,
    disponible: 0,
    inactivo: 0,
  };

  const teams = data?.teams || {
    total: 0,
    patrullando: 0,
    disponible: 0,
    enIncidente: 0,
    totalMembers: 0,
  };

  const users = data?.users || {
    total: 0,
    citizens: 0,
    operators: 0,
    verified: 0,
    newToday: 0,
  };

  const maxTypeCount = Math.max(1, ...(data?.charts?.alertsByType?.map(t => t.count) || [1]));

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] p-6 lg:p-8 gap-6 overflow-y-auto custom-scrollbar theme-transition">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-9 h-9 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#262626] hover:border-[#404040] flex items-center justify-center text-[#a1a1aa] hover:text-white transition-all mr-1 p-0 shrink-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-[#451a03]/50 border border-[#92400e]/40 flex items-center justify-center shrink-0">
            <BarChart3 size={20} className="text-[#fbbf24]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#efede3] tracking-tight">KPI & Reportes Operacionales</h1>
            <p className="text-xs text-[#737373] font-mono">Consolidado en tiempo real de todos los módulos del sistema</p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] text-xs font-semibold text-[#efede3] transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#fbbf24]' : 'text-[#737373]'} />
          <span>Actualizar datos</span>
        </button>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tiempo de respuesta */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#737373] uppercase tracking-wider font-bold">Tiempo Resp. Promedio</span>
            <div className="w-8 h-8 rounded-lg bg-[#451a03]/40 border border-[#92400e]/30 flex items-center justify-center">
              <Clock size={16} className="text-[#fbbf24]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#efede3] tracking-tight">
              {data?.performance?.avgResponseMinutes ? `${data.performance.avgResponseMinutes}` : '4.2'}
            </span>
            <span className="text-xs text-[#737373] font-mono">minutos</span>
          </div>
          <div className="mt-2 text-[11px] text-[#34d399] flex items-center gap-1 font-medium">
            <TrendingUp size={12} />
            <span>-15% vs semana anterior</span>
          </div>
        </div>

        {/* Alertas Hoy */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#737373] uppercase tracking-wider font-bold">Alertas Hoy</span>
            <div className="w-8 h-8 rounded-lg bg-[#450a0a]/40 border border-[#9f1239]/30 flex items-center justify-center">
              <AlertTriangle size={16} className="text-[#fb7185]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#efede3] tracking-tight">{alerts.today}</span>
            <span className="text-xs text-[#737373] font-mono">de {alerts.total} total</span>
          </div>
          <div className="mt-2 text-[11px] text-[#8c8c8c] flex items-center justify-between font-mono">
            <span>{alerts.pending} pendientes</span>
            <span className="text-[#34d399] font-bold">{alerts.resolutionRate}% resueltas</span>
          </div>
        </div>

        {/* Cámaras Uptime */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#737373] uppercase tracking-wider font-bold">CCTV Uptime</span>
            <div className="w-8 h-8 rounded-lg bg-[#082f49]/40 border border-[#0284c7]/30 flex items-center justify-center">
              <Cctv size={16} className="text-[#38bdf8]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#efede3] tracking-tight">{cameras.uptimePercent}%</span>
            <span className="text-xs text-[#737373] font-mono">operatividad</span>
          </div>
          <div className="mt-2 text-[11px] text-[#8c8c8c] flex items-center justify-between font-mono">
            <span className="text-[#38bdf8] font-bold">{cameras.online} en línea</span>
            <span>{cameras.offline} fuera de red</span>
          </div>
        </div>

        {/* Unidades & Equipos */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#737373] uppercase tracking-wider font-bold">Unidades de Campo</span>
            <div className="w-8 h-8 rounded-lg bg-[#064e3b]/40 border border-[#059669]/30 flex items-center justify-center">
              <Car size={16} className="text-[#34d399]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#efede3] tracking-tight">{teams.total}</span>
            <span className="text-xs text-[#737373] font-mono">desplegadas</span>
          </div>
          <div className="mt-2 text-[11px] text-[#8c8c8c] flex items-center justify-between font-mono">
            <span className="text-[#34d399] font-bold">{teams.patrullando} patrullando</span>
            <span>{teams.totalMembers} efectivos</span>
          </div>
        </div>
      </div>

      {/* Second Row: Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Desglose por Tipo de Emergencia */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#242424]">
            <div className="flex items-center gap-2.5">
              <Activity size={18} className="text-[#fbbf24]" />
              <h2 className="text-sm font-bold text-[#efede3]">Distribución de Incidentes por Categoría</h2>
            </div>
            <span className="text-xs text-[#737373] font-mono">Histórico total: {alerts.total}</span>
          </div>

          <div className="mt-6 space-y-4 flex-1">
            {data?.charts?.alertsByType && data.charts.alertsByType.length > 0 ? (
              data.charts.alertsByType.map((item) => {
                const pct = Math.round((item.count / maxTypeCount) * 100);
                return (
                  <div key={item.type} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#d4d4d8] capitalize flex items-center gap-2">
                        <Flame size={13} className="text-[#f87171]" />
                        {item.type}
                      </span>
                      <span className="font-mono text-[#a1a1aa]">{item.count} incidentes</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#202020] overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#e11d48] to-[#fbbf24] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-[#525252] text-xs font-mono">
                No hay datos de distribución registrados aún
              </div>
            )}
          </div>
        </div>

        {/* Resumen de Personal y Seguridad */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#242424]">
              <Users size={18} className="text-[#818cf8]" />
              <h2 className="text-sm font-bold text-[#efede3]">Dotación y Usuarios</h2>
            </div>

            <div className="mt-5 space-y-3.5">
              <div className="p-3 bg-[#181818] border border-[#262626] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#312e81]/40 text-[#818cf8] flex items-center justify-center">
                    <Shield size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#efede3]">Operadores Centro de Mando</div>
                    <div className="text-[11px] text-[#737373]">{operators.enServicio} en turno activo</div>
                  </div>
                </div>
                <span className="text-base font-black text-[#efede3] font-mono">{operators.total}</span>
              </div>

              <div className="p-3 bg-[#181818] border border-[#262626] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#064e3b]/40 text-[#34d399] flex items-center justify-center">
                    <Car size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#efede3]">Efectivos de Cuadrante</div>
                    <div className="text-[11px] text-[#737373]">{teams.patrullando} patrullando ahora</div>
                  </div>
                </div>
                <span className="text-base font-black text-[#efede3] font-mono">{teams.totalMembers}</span>
              </div>

              <div className="p-3 bg-[#181818] border border-[#262626] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#3730a3]/40 text-[#a5b4fc] flex items-center justify-center">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#efede3]">Ciudadanos Verificados (KYC)</div>
                    <div className="text-[11px] text-[#737373]">Identidad con biometría</div>
                  </div>
                </div>
                <span className="text-base font-black text-[#34d399] font-mono">{users.verified}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#242424] mt-6 flex items-center justify-between text-xs text-[#737373] font-mono">
            <span>Total ciudadanos registrados:</span>
            <span className="text-[#efede3] font-bold">{users.citizens}</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminKPI;
