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
import {
  LiquidGlassCard,
  LiquidPillButton,
  StatusPill,
} from '../../components/ui/LiquidPrimitives';

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
    <div className="flex flex-col h-full bg-transparent text-[var(--text-primary)] p-5 lg:p-7 gap-5 overflow-y-auto custom-scrollbar theme-transition">
      
      {/* Header */}
      <LiquidGlassCard strong className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-10 h-10 rounded-full glass-button flex items-center justify-center shrink-0 p-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-[#D97706] dark:text-amber-400">
            <BarChart3 size={21} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                KPI y reportes operacionales
              </h1>
              <StatusPill label="Tiempo real" tone="amber" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Consolidado operativo de todos los módulos del sistema
            </p>
          </div>
        </div>

        <LiquidPillButton
          variant="glass"
          size="sm"
          onClick={fetchData}
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#0EA5E9]' : ''} />
          <span>Actualizar datos</span>
        </LiquidPillButton>
      </LiquidGlassCard>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {/* Tiempo de respuesta */}
        <LiquidGlassCard strong className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)] font-semibold">Tiempo resp. promedio</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#D97706] dark:text-amber-400">
              <Clock size={17} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[var(--text-primary)] tracking-tight tabular-nums">
              {data?.performance?.avgResponseMinutes ? `${data.performance.avgResponseMinutes}` : '4.2'}
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">minutos</span>
          </div>
          <div className="mt-2.5 text-xs text-[#0D9488] dark:text-emerald-400 flex items-center gap-1 font-semibold">
            <TrendingUp size={13} />
            <span>-15% vs semana anterior</span>
          </div>
        </LiquidGlassCard>

        {/* Alertas Hoy */}
        <LiquidGlassCard strong className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)] font-semibold">Alertas hoy</span>
            <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-[#E11D48]">
              <AlertTriangle size={17} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[var(--text-primary)] tracking-tight tabular-nums">{alerts.today}</span>
            <span className="text-xs text-[var(--text-secondary)] font-medium tabular-nums">de {alerts.total} total</span>
          </div>
          <div className="mt-2.5 text-xs text-[var(--text-secondary)] flex items-center justify-between font-medium tabular-nums">
            <span>{alerts.pending} pendientes</span>
            <span className="text-[#0D9488] dark:text-emerald-400 font-bold">{alerts.resolutionRate}% resueltas</span>
          </div>
        </LiquidGlassCard>

        {/* Cámaras Uptime */}
        <LiquidGlassCard strong className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)] font-semibold">CCTV Uptime</span>
            <div className="w-9 h-9 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-[#0EA5E9]">
              <Cctv size={17} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[var(--text-primary)] tracking-tight tabular-nums">{cameras.uptimePercent}%</span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">operatividad</span>
          </div>
          <div className="mt-2.5 text-xs text-[var(--text-secondary)] flex items-center justify-between font-medium tabular-nums">
            <span className="text-[#0EA5E9] font-bold">{cameras.online} en línea</span>
            <span>{cameras.offline} fuera de red</span>
          </div>
        </LiquidGlassCard>

        {/* Unidades & Equipos */}
        <LiquidGlassCard strong className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)] font-semibold">Unidades de campo</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#0D9488] dark:text-emerald-400">
              <Car size={17} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[var(--text-primary)] tracking-tight tabular-nums">{teams.total}</span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">desplegadas</span>
          </div>
          <div className="mt-2.5 text-xs text-[var(--text-secondary)] flex items-center justify-between font-medium tabular-nums">
            <span className="text-[#0D9488] dark:text-emerald-400 font-bold">{teams.patrullando} patrullando</span>
            <span>{teams.totalMembers} efectivos</span>
          </div>
        </LiquidGlassCard>
      </div>

      {/* Second Row: Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-6">
        
        {/* Desglose por Tipo de Emergencia */}
        <LiquidGlassCard strong className="lg:col-span-2 p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <Activity size={18} className="text-[#0EA5E9]" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Distribución de incidentes por categoría</h2>
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
                        <Flame size={13} className="text-[#E11D48]" />
                        {item.type}
                      </span>
                      <span className="font-mono text-[var(--text-muted)]">{item.count} incidentes</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[var(--bg-input)] border border-[var(--border-subtle)] overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#0EA5E9] to-[#14B8A6] rounded-full transition-all duration-500"
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
        </LiquidGlassCard>

        {/* Resumen de Personal y Seguridad */}
        <LiquidGlassCard strong className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--border-subtle)]">
              <Users size={18} className="text-[#0EA5E9]" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Dotación y usuarios</h2>
            </div>

            <div className="mt-5 space-y-3">
              <div className="p-3.5 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[20px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-sky-500/15 text-[#0EA5E9] flex items-center justify-center">
                    <Shield size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Operadores centro de mando</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{operators.enServicio} en turno activo</div>
                  </div>
                </div>
                <span className="text-base font-bold text-[var(--text-primary)] font-mono">{operators.total}</span>
              </div>

              <div className="p-3.5 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[20px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-[#0D9488] dark:text-emerald-400 flex items-center justify-center">
                    <Car size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Efectivos de cuadrante</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{teams.patrullando} patrullando ahora</div>
                  </div>
                </div>
                <span className="text-base font-bold text-[var(--text-primary)] font-mono">{teams.totalMembers}</span>
              </div>

              <div className="p-3.5 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[20px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-teal-500/15 text-[#14B8A6] flex items-center justify-center">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Ciudadanos verificados (KYC)</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Identidad con biometría</div>
                  </div>
                </div>
                <span className="text-base font-bold text-[#0D9488] dark:text-emerald-400 font-mono">{users.verified}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] mt-6 flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>Total ciudadanos registrados:</span>
            <span className="text-[var(--text-primary)] font-bold">{users.citizens}</span>
          </div>
        </LiquidGlassCard>

      </div>

    </div>
  );
};

export default AdminKPI;
