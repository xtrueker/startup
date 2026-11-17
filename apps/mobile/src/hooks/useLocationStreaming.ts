import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../services/auth';
import { OfflineBufferService } from '../features/panic/services/OfflineBufferService';

interface LocationStreamingOptions {
  alertId: string | null;
  intervalMs?: number;
}

/**
 * Transmite la ubicación GPS en vivo durante una emergencia activa (iOS, Android y Web).
 * Si la alerta está en modo offline o se pierde señal a mitad del recorrido,
 * almacena cada coordenada en OfflineBufferService para sincronización garantizada.
 */
export function useLocationStreaming({
  alertId,
  intervalMs = 3000,
}: LocationStreamingOptions) {
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!alertId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    let active = true;

    const dispatchCoordinates = async (coords: {
      latitude: number;
      longitude: number;
      accuracy?: number | null;
      speed?: number | null;
      heading?: number | null;
    }) => {
      if (!active) return;
      setCurrentLocation({ lat: coords.latitude, lng: coords.longitude });

      const payload = {
        alertId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy ?? null,
        speed: coords.speed ?? null,
        heading: coords.heading ?? null,
      };

      if (alertId.startsWith('OFFLINE_')) {
        await OfflineBufferService.enqueue('GPS_UPDATE', payload);
        return;
      }

      try {
        await api.post('/mobile/location', payload);
      } catch {
        await OfflineBufferService.enqueue('GPS_UPDATE', payload);
      }
    };

    const requestAndStream = async () => {
      if (Platform.OS === 'web') {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          setError('Geolocalización no disponible en este navegador');
          return;
        }

        const pollWebGps = () => {
          if (!active) return;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              dispatchCoordinates(pos.coords).catch(() => {});
            },
            () => {},
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 }
          );
        };

        pollWebGps();
        intervalRef.current = setInterval(pollWebGps, intervalMs);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permiso de ubicación denegado');
        return;
      }

      const sendNativeLocation = async () => {
        if (!active) return;
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await dispatchCoordinates(loc.coords);
        } catch (e) {
          console.warn('Actualización GPS diferida:', e);
        }
      };

      await sendNativeLocation();
      intervalRef.current = setInterval(sendNativeLocation, intervalMs);
    };

    requestAndStream();

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [alertId, intervalMs]);

  return { currentLocation, error };
}
