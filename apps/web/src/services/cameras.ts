import api from './api';

export interface Camera {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  streamUrl: string;
  status: string;
  coverageRadius: number;
  isPublic: boolean;
}

export interface CreateCameraData {
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  streamUrl: string;
  coverageRadius?: number;
  isPublic?: boolean;
  authorityId?: string;
  protocol?: 'rtsp' | 'webrtc' | 'hls' | 'http';
  model?: string;
}

export const cameraService = {
  // Obtener todas las cámaras
  getCameras: async (): Promise<Camera[]> => {
    const response = await api.get('/cameras');
    return response.data.data;
  },

  // Crear cámara
  createCamera: async (data: CreateCameraData) => {
    const response = await api.post('/cameras', data);
    return response.data;
  },

  // Actualizar cámara
  updateCamera: async (id: string, data: Partial<CreateCameraData & { location: any }>) => {
    const response = await api.put(`/cameras/${id}`, data);
    return response.data;
  },

  // Eliminar cámara
  deleteCamera: async (id: string) => {
    const response = await api.delete(`/cameras/${id}`);
    return response.data;
  },

  // Descubrir cámara automáticamente en red local
  discoverCamera: async (force: boolean = false) => {
    const response = await api.get(`/cameras/discover${force ? '?force=true' : ''}`);
    return response.data;
  },

  // Estado del escáner de red
  getCameraScannerStatus: async () => {
    const response = await api.get('/cameras/status');
    return response.data;
  }
};