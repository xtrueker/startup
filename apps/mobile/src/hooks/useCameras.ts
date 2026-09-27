import { useState, useCallback } from 'react';
import { api } from '../services/auth';
import { localDatabase } from '../services/localDatabase';

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
      if (res.data?.success && Array.isArray(res.data.data)) {
        setCameras(res.data.data);
        // Persistir en la base de datos local
        await localDatabase.cacheCameras(
          res.data.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            latitude: c.location.latitude,
            longitude: c.location.longitude,
            streamUrl: c.streamUrl,
            status: c.status,
          }))
        );
      } else {
        setError('Error al decodificar cámaras');
      }
    } catch (err: any) {
      // Fallback a la base de datos local si la red está caída
      const cached = await localDatabase.getCachedCameras();
      if (cached.length > 0) {
        setCameras(
          cached.map((c) => ({
            id: c.id,
            name: c.name,
            location: { latitude: c.latitude, longitude: c.longitude },
            streamUrl: c.streamUrl || '',
            status: c.status,
          }))
        );
      } else {
        setError(err.message || 'Error de red obteniendo cámaras');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { cameras, loading, error, fetchCameras };
}
