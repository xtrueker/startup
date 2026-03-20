import { useState, useEffect, useRef, useCallback } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number; // meters
}

interface Options {
  smoothingWindow?: number; // # of readings to average (noise reduction)
  updateIntervalMs?: number;
}

/**
 * A hook that tracks the user's real-time GPS position with
 * EWMA smoothing to reduce GPS noise/jitter before presenting data.
 */
export function useGeolocation({ smoothingWindow = 5, updateIntervalMs = 5000 }: Options = {}) {
  const [position, setPosition]   = useState<GeoPosition | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const ringBuffer                = useRef<GeoPosition[]>([]);
  const watchId                   = useRef<number | null>(null);

  // Exponential weighted average across a ring buffer
  const smooth = useCallback((readings: GeoPosition[]): GeoPosition => {
    if (readings.length === 1) return readings[0];
    // Weight more recent readings heavier
    let wLat = 0, wLng = 0, wAcc = 0, totalW = 0;
    readings.forEach((r, i) => {
      const w = i + 1;           // weight = index+1 (last is heaviest)
      wLat  += r.lat  * w;
      wLng  += r.lng  * w;
      wAcc  += r.accuracy * w;
      totalW += w;
    });
    return { lat: wLat / totalW, lng: wLng / totalW, accuracy: wAcc / totalW };
  }, []);

  const onSuccess = useCallback((pos: GeolocationPosition) => {
    const reading: GeoPosition = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
    // Maintain ring buffer of last N readings
    ringBuffer.current = [...ringBuffer.current, reading].slice(-smoothingWindow);
    const smoothed = smooth(ringBuffer.current);
    setPosition(smoothed);
    setLoading(false);
    setError(null);
  }, [smooth, smoothingWindow]);

  const onError = useCallback((err: GeolocationPositionError) => {
    setLoading(false);
    if (err.code === err.PERMISSION_DENIED) {
      setError('permission_denied');
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      setError('unavailable');
    } else {
      setError('timeout');
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('not_supported');
      setLoading(false);
      return;
    }

    // Initial one-shot read for fast first position
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    });

    // Continuous watch for real-time tracking
    watchId.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: updateIntervalMs,
    });

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [onSuccess, onError, updateIntervalMs]);

  return { position, error, loading };
}
