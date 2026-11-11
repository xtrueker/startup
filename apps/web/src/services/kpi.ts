import api from './api';

export interface KpiSummary {
  alerts: {
    total: number;
    pending: number;
    reviewing: number;
    resolved: number;
    today: number;
    thisWeek: number;
    resolutionRate: number;
  };
  cameras: {
    total: number;
    online: number;
    offline: number;
    uptimePercent: number;
  };
  operators: {
    total: number;
    enServicio: number;
    disponible: number;
    inactivo: number;
  };
  teams: {
    total: number;
    patrullando: number;
    disponible: number;
    enIncidente: number;
    totalMembers: number;
  };
  users: {
    total: number;
    citizens: number;
    operators: number;
    verified: number;
    newToday: number;
  };
  performance: {
    avgResponseMinutes: number | null;
  };
  charts: {
    alertsByType: Array<{ type: string; count: number }>;
    alertsByDay: Array<{ day: string; count: number }>;
  };
}

export const kpiService = {
  async getSummary(): Promise<KpiSummary> {
    const res = await api.get('/kpi/summary');
    return res.data?.data;
  },

  async getAlertsTimeline(days?: number): Promise<Array<{
    hour: string;
    count: number;
    emergency: number;
    suspicious: number;
    medical: number;
    fire: number;
  }>> {
    const q = days ? `?days=${days}` : '';
    const res = await api.get(`/kpi/alerts-timeline${q}`);
    return res.data?.data || [];
  },
};
