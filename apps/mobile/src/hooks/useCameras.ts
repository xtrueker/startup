import { useState, useCallback } from 'react';
import { api } from '../services/auth';

export interface PublicCamera {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  streamUrl: string;
  status: string;
}

export function useCameras() {
  const [cameras, setCameras] = useState<PublicCamera[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCameras = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/cameras');
      if (res.data?.success) {
        setCameras(res.data.data);
      } else {
        setError('Error al decodificar cámaras');
      }
    } catch (err: any) {
      setError(err.message || 'Error de red obteniendo cámaras');
    } finally {
      setLoading(false);
    }
  }, []);

  return { cameras, loading, error, fetchCameras };
}
