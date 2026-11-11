import api from './api';

export interface Operator {
  id: string;
  userId?: string;
  fullName: string;
  cedula: string;
  email: string;
  phone?: string;
  consoleStation: string;
  shift: 'mañana' | 'tarde' | 'noche' | '24x48';
  specialty: 'cctv' | 'despacho' | 'tactico' | 'supervisor';
  status: 'en_servicio' | 'disponible' | 'en_descanso' | 'inactivo';
  zoneAssigned: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOperatorPayload {
  fullName: string;
  cedula: string;
  email: string;
  password?: string;
  phone?: string;
  consoleStation?: string;
  shift?: Operator['shift'];
  specialty?: Operator['specialty'];
  status?: Operator['status'];
  zoneAssigned?: string;
}

export interface OperatorStats {
  total: number;
  en_servicio: number;
  disponible: number;
  en_descanso: number;
  inactivo: number;
  cctv: number;
  despacho: number;
  tactico: number;
  supervisor: number;
}

export const operatorService = {
  async getOperators(params?: { shift?: string; status?: string }): Promise<Operator[]> {
    const query = new URLSearchParams();
    if (params?.shift) query.set('shift', params.shift);
    if (params?.status) query.set('status', params.status);
    const res = await api.get(`/operators?${query.toString()}`);
    return res.data?.data || [];
  },

  async getStats(): Promise<OperatorStats> {
    const res = await api.get('/operators/stats');
    return res.data?.data;
  },

  async getOperator(id: string): Promise<Operator> {
    const res = await api.get(`/operators/${id}`);
    return res.data?.data;
  },

  async createOperator(payload: CreateOperatorPayload): Promise<Operator> {
    const res = await api.post('/operators', payload);
    return res.data?.data;
  },

  async updateOperator(id: string, payload: Partial<CreateOperatorPayload & { status: Operator['status'] }>): Promise<Operator> {
    const res = await api.patch(`/operators/${id}`, payload);
    return res.data?.data;
  },

  async deleteOperator(id: string): Promise<void> {
    await api.delete(`/operators/${id}`);
  },
};
