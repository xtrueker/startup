import api from './api';

export const analysisService = {
  // Obtener zonas calientes (heatmap histórico)
  getHotspots: async (): Promise<number[][]> => {
    const response = await api.get('/analysis/hotspots');
    return response.data.data; // array of [lat, lng, weight]
  },

  // Calcular zona de alcance del sospechoso (isócrona)
  getReachability: async (
    lat: number,
    lng: number,
    mode: 'caminando' | 'bicicleta' | 'motocicleta' | 'vehiculo',
    minutes: number
  ) => {
    const response = await api.get('/analysis/reachability', {
      params: { lat, lng, mode, minutes }
    });
    return response.data.data; // GeoJSON Polygon
  },
};
