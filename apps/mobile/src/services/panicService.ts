import * as Location from 'expo-location';
import { api } from './auth';
import { CovertAudioService } from '../features/panic/services/CovertAudioService';
import { OfflineBufferService } from '../features/panic/services/OfflineBufferService';
import { localDatabase } from './localDatabase';

export interface PanicTriggerOptions {
  triggerType?: 'button' | 'ghost_mode';
  description?: string;
  customCoords?: { latitude: number; longitude: number };
}

export interface PanicState {
  alertId: string | null;
  status: 'idle' | 'triggering' | 'active' | 'cancelling';
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  triggerType: 'button' | 'ghost_mode' | null;
  isOffline: boolean;
  errorMessage?: string | null;
}

type PanicListener = (state: PanicState) => void;

class PanicService {
  private state: PanicState = {
    alertId: null,
    status: 'idle',
    latitude: null,
    longitude: null,
    address: null,
    triggerType: null,
    isOffline: false,
    errorMessage: null,
  };

  private listeners: Set<PanicListener> = new Set();

  public getState(): PanicState {
    return { ...this.state };
  }

  public subscribe(listener: PanicListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Error notigying panic listener:', err);
      }
    });
  }

  /**
   * Obtiene la ubicación precisa del dispositivo con expo-location
   */
  public async getPreciseLocation(): Promise<{
    latitude: number;
    longitude: number;
    address: string;
  }> {
    let latitude = 4.6097; // Coordenadas de contingencia (Bogotá)
    let longitude = -74.0817;
    let address = 'Ubicación móvil';

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // Intentar obtener posición de alta precisión
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;

        try {
          const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geo) {
            const street = geo.street || geo.name || '';
            const district = geo.district || geo.subregion || '';
            const city = geo.city || '';
            address = [street, district, city].filter(Boolean).join(', ') || 'Dirección detectada por GPS';
          }
        } catch (geoError) {
          console.warn('[PanicService] Error en geocodificación inversa:', geoError);
        }
      } else {
        // Fallback a última posición conocida si el permiso no fue concedido recientemente
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          latitude = lastKnown.coords.latitude;
          longitude = lastKnown.coords.longitude;
          address = 'Última ubicación conocida (permiso restringido)';
        }
      }
    } catch (locErr) {
      console.warn('[PanicService] No se pudo obtener GPS en tiempo real:', locErr);
    }

    return { latitude, longitude, address };
  }

  /**
   * Dispara una alerta de pánico (tanto desde el botón visual como del Modo Fantasma)
   */
  public async sendPanicAlert(options?: PanicTriggerOptions): Promise<PanicState> {
    const triggerType = options?.triggerType || 'button';
    const isGhost = triggerType === 'ghost_mode';

    this.state = {
      ...this.state,
      status: 'triggering',
      triggerType,
      errorMessage: null,
    };
    this.notify();

    try {
      // 1. Obtener coordenadas
      let latitude: number;
      let longitude: number;
      let address: string;

      if (options?.customCoords) {
        latitude = options.customCoords.latitude;
        longitude = options.customCoords.longitude;
        address = 'Coordenadas provistas';
      } else {
        const locationResult = await this.getPreciseLocation();
        latitude = locationResult.latitude;
        longitude = locationResult.longitude;
        address = locationResult.address;
      }

      // 2. Preparar payload para el backend
      const description =
        options?.description ||
        (isGhost
          ? '🚨 PÁNICO SIGILOSO: Modo Fantasma activado mediante botones físicos de volumen'
          : '🚨 ALERTA DE PÁNICO activada desde botón central SOS');

      const payload = {
        latitude,
        longitude,
        address,
        description,
        type: 'emergency',
      };

      let alertId: string;
      let isOffline = false;

      // 3. Envío HTTP POST al backend
      try {
        const res = await api.post('/mobile/panic', payload);
        alertId = res.data?.data?.alertId || `ALERT_${Date.now()}`;
        console.log(`[PanicService] Alerta transmitida con éxito: ${alertId}`);
      } catch (apiErr) {
        console.warn('[PanicService] Error enviando a la API, recurriendo a cola offline:', apiErr);
        isOffline = true;
        alertId = `OFFLINE_${Date.now()}`;
        try {
          await OfflineBufferService.enqueue('PANIC_TRIGGER', payload);
        } catch (enqueueErr) {
          console.warn('[PanicService] Error encolando en offline buffer:', enqueueErr);
        }
      }

      // 4. Iniciar recolección de audio encubierta
      try {
        CovertAudioService.startCovertRecording(alertId);
      } catch (audioErr) {
        console.warn('[PanicService] Error iniciando audio encubierto:', audioErr);
      }

      // 5. Persistir en la base de datos local SQLite del dispositivo
      try {
        await localDatabase.saveAlert({
          id: `local_${Date.now()}`,
          alertId,
          triggerType,
          latitude,
          longitude,
          address,
          description,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('[PanicService] Error guardando en BD local:', dbErr);
      }

      this.state = {
        alertId,
        status: 'active',
        latitude,
        longitude,
        address,
        triggerType,
        isOffline,
        errorMessage: null,
      };
      this.notify();
      return this.getState();
    } catch (fatalErr: any) {
      console.error('[PanicService] Error fatal activando pánico:', fatalErr);
      this.state = {
        ...this.state,
        status: 'idle',
        errorMessage: fatalErr?.message || 'Error al disparar alerta de pánico',
      };
      this.notify();
      throw fatalErr;
    }
  }

  /**
   * Cancela la alerta de pánico activa
   */
  public async cancelPanicAlert(): Promise<void> {
    const { alertId } = this.state;
    if (!alertId) return;

    this.state = {
      ...this.state,
      status: 'cancelling',
    };
    this.notify();

    try {
      if (!alertId.startsWith('OFFLINE_')) {
        await api.patch(`/mobile/alerts/${alertId}/cancel`);
      }
      await CovertAudioService.stopCovertRecording();

      this.state = {
        alertId: null,
        status: 'idle',
        latitude: null,
        longitude: null,
        address: null,
        triggerType: null,
        isOffline: false,
        errorMessage: null,
      };
      this.notify();
    } catch (err: any) {
      console.error('[PanicService] Error cancelando alerta:', err);
      // Aún así restablecemos el estado en el dispositivo si el usuario confirmó falsa alarma
      await CovertAudioService.stopCovertRecording();
      this.state = {
        alertId: null,
        status: 'idle',
        latitude: null,
        longitude: null,
        address: null,
        triggerType: null,
        isOffline: false,
        errorMessage: null,
      };
      this.notify();
    }
  }
}

export const panicService = new PanicService();
