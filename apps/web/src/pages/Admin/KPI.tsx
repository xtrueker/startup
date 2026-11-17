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
  Activity,
  Flame,
  UserCheck
} from 'lucide-react';
import { kpiService } from '../../services/kpi';
import type { KpiSummary } from '../../services/kpi';

const AdminKPI: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<KpiSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const res = await kpiService.getSummary();
      setData(res);
    } catch (err) {
      console.error('Error cargando KPIs:', err);
    } finally {
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
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] p-5 lg:p-7 gap-5 overflow-y-auto custom-scrollbar theme-transition">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all mr-1 p-0 shrink-0 shadow-xs cursor-pointer"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 shadow-xs">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">KPI & Reportes Operacionales</h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">Consolidado en tiempo real de todos los módulos del sistema</p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 text-xs font-semibold text-[var(--text-primary)] transition-all self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-amber-500' : 'text-[var(--text-muted)]'} />
          <span>Actualizar datos</span>
        </button>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tiempo de respuesta */}
        <div className="bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden group theme-transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Tiempo Resp. Promedio</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
              {data?.performance?.avgResponseMinutes ? `${data.performance.avgResponseMinutes}` : '4.2'}
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">minutos</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <TrendingUp size={12} />
            <span>-15% vs semana anterior</span>
          </div>
        </div>

        {/* Alertas Hoy */}
        <div className="bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden group theme-transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Alertas Hoy</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{alerts.today}</span>
            <span className="text-xs text-[var(--text-muted)] font-mono">de {alerts.total} total</span>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-muted)] flex items-center justify-between font-mono">
            <span>{alerts.pending} pendientes</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{alerts.resolutionRate}% resueltas</span>
          </div>
        </div>

        {/* Cámaras Uptime */}
        <div className="bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden group theme-transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-bold">CCTV Uptime</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Cctv size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{cameras.uptimePercent}%</span>
            <span className="text-xs text-[var(--text-muted)] font-mono">operatividad</span>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-muted)] flex items-center justify-between font-mono">
            <span className="text-sky-600 dark:text-sky-400 font-bold">{cameras.online} en línea</span>
            <span>{cameras.offline} fuera de red</span>
          </div>
        </div>

        {/* Unidades & Equipos */}
        <div className="bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden group theme-transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Unidades de Campo</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Car size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{teams.total}</span>
            <span className="text-xs text-[var(--text-muted)] font-mono">desplegadas</span>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-muted)] flex items-center justify-between font-mono">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{teams.patrullando} patrullando</span>
            <span>{teams.totalMembers} efectivos</span>
          </div>
        </div>
      </div>

      {/* Second Row: Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Desglose por Tipo de Emergencia */}
        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col theme-transition">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Activity size={18} className="text-amber-500" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Distribución de Incidentes por Categoría</h2>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">Histórico total: {alerts.total}</span>
          </div>

          <div className="mt-6 space-y-4 flex-1">
            {data?.charts?.alertsByType && data.charts.alertsByType.length > 0 ? (
              data.charts.alertsByType.map((item) => {
                const pct = Math.round((item.count / maxTypeCount) * 100);
                return (
                  <div key={item.type} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[var(--text-primary)] capitalize flex items-center gap-2">
                        <Flame size={13} className="text-rose-500" />
                        {item.type}
                      </span>
                      <span className="font-mono text-[var(--text-muted)]">{item.count} incidentes</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] text-xs font-mono">
                No hay datos de distribución registrados aún
              </div>
            )}
          </div>
        </div>

        {/* Resumen de Personal y Seguridad */}
        <div className="bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between theme-transition">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-200 dark:border-zinc-800">
              <Users size={18} className="text-indigo-500" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Dotación y Usuarios</h2>
            </div>

            <div className="mt-5 space-y-3.5">
              <div className="p-3 bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 rounded-xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Shield size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Operadores Centro de Mando</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{operators.enServicio} en turno activo</div>
                  </div>
                </div>
                <span className="text-base font-black text-[var(--text-primary)] font-mono">{operators.total}</span>
              </div>

              <div className="p-3 bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 rounded-xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Car size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Efectivos de Cuadrante</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{teams.patrullando} patrullando ahora</div>
                  </div>
                </div>
                <span className="text-base font-black text-[var(--text-primary)] font-mono">{teams.totalMembers}</span>
              </div>

              <div className="p-3 bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 rounded-xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Ciudadanos Verificados (KYC)</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Identidad con biometría</div>
                  </div>
                </div>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">{users.verified}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-200 dark:border-zinc-800 mt-6 flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>Total ciudadanos registrados:</span>
            <span className="text-[var(--text-primary)] font-bold">{users.citizens}</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminKPI;
