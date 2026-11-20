import { useState, useCallback } from 'react';
import { api } from '../services/auth';
import { localDatabase } from '../services/localDatabase';
import {
  DEFAULT_CAMERA_RADIUS_M,
  isValidCoordinate,
} from '../components/tacticalMapShared';

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
  coverageRadius?: number;
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
        const normalized: PublicCamera[] = res.data.data
          .map((c: any) => {
            const lat = Number(c?.location?.latitude ?? c?.latitude);
            const lng = Number(c?.location?.longitude ?? c?.longitude);
            return {
              id: String(c.id),
              name: c.name || 'Cámara comunitaria',
              location: {
                latitude: lat,
                longitude: lng,
                address: c?.location?.address || c?.address || '',
              },
              streamUrl: c.streamUrl || '',
              status: c.status || 'online',
              coverageRadius: Number(c.coverageRadius) || DEFAULT_CAMERA_RADIUS_M,
            };
          })
          .filter((c: PublicCamera) =>
            isValidCoordinate(c.location.latitude, c.location.longitude)
          );

        setCameras(normalized);

        await localDatabase.cacheCameras(
          normalized.map((c) => ({
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
      const cached = await localDatabase.getCachedCameras();
      const validCached = cached
        .filter((c) => isValidCoordinate(c.latitude, c.longitude))
        .map((c) => ({
          id: c.id,
          name: c.name,
          location: {
            latitude: Number(c.latitude),
            longitude: Number(c.longitude),
          },
          streamUrl: c.streamUrl || '',
          status: c.status,
          coverageRadius: DEFAULT_CAMERA_RADIUS_M,
        }));

      if (validCached.length > 0) {
        setCameras(validCached);
      } else {
        setError(err.message || 'Error de red obteniendo cámaras');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { cameras, loading, error, fetchCameras };
}
