import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { api } from '../services/auth';

interface LocationStreamingOptions {
  alertId: string | null;
  intervalMs?: number;
}

/**
 * Streams the device GPS location to the backend while an alert is active.
 * Stops automatically when alertId is null (no active emergency).
 */
export function useLocationStreaming({ alertId, intervalMs = 3000 }: LocationStreamingOptions) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!alertId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    let active = true;

    const requestAndStream = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permiso de ubicación denegado');
        return;
      }

      const sendLocation = async () => {
        if (!active) return;
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const { latitude, longitude, accuracy, speed, heading } = loc.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });

          await api.post('/mobile/location', {
            alertId,
            latitude,
            longitude,
            accuracy,
            speed,
            heading,
          });
        } catch (e) {
          // Network may be flaky during emergency — silent retry
          console.warn('Location update failed, retrying...', e);
        }
      };

      // Send immediately, then on interval
      await sendLocation();
      intervalRef.current = setInterval(sendLocation, intervalMs);
    };

    requestAndStream();

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [alertId, intervalMs]);

  return { currentLocation, error };
}
