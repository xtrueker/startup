import api from './api';

export interface CreateAlertData {
  userId: string;
  type: 'emergency' | 'suspicious' | 'medical' | 'fire' | 'robo' | 'other';
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
  direction?: string;
}

export interface EscapeRoute {
  geometry: any; // GeoJSON LineString
  priority: 'high' | 'medium' | 'low';
  score: number;
  nearbyCameras: string[];
  metadata: { distance: number; duration: number };
}

export interface Alert {
  id: string;
  type: string;
  status: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  description: string;
  direction?: string;
  escapeRoutes?: EscapeRoute[];
  createdAt: string;
}

export const alertService = {
  // Crear alerta
  createAlert: async (data: CreateAlertData) => {
    const response = await api.post('/alerts', data);
    return response.data;
  },

  // Obtener todas las alertas
  getAlerts: async (): Promise<Alert[]> => {
    const response = await api.get('/alerts');
    return response.data.data;
  },

  // Eliminar alerta (la archiva como incidente histórico)
  deleteAlert: async (id: string) => {
    const response = await api.delete(`/alerts/${id}`);
    return response.data;
  },
};