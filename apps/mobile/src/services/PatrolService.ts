import * as Location from 'expo-location';
import { api } from './auth';
import { config } from '../config';
import io, { Socket } from 'socket.io-client';
import { authService } from './auth';

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export type PatrolStatus = 'off_duty' | 'available' | 'responding' | 'busy';

export interface PatrolState {
  isActive: boolean;
  status: PatrolStatus;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;     // m/s
  heading: number | null;   // grados
  accuracy: number | null;  // metros
  startedAt: string | null;
  lastUpdate: string | null;
  errorMessage: string | null;
}

export interface TacticalDispatch {
  alertId: string;
  citizenName: string;
  emergencyType: string;
  latitude: number;
  longitude: number;
  address?: string;
  dispatchedAt: string;
  notes?: string;
}

export interface PatrolLocationUpdate {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  status: PatrolStatus;
  timestamp: string;
}

type PatrolListener = (state: PatrolState) => void;
type DispatchListener = (dispatch: TacticalDispatch) => void;

// ─── SERVICIO ────────────────────────────────────────────────────────────────

class PatrolService {
  private state: PatrolState = {
    isActive: false,
    status: 'off_duty',
    latitude: null,
    longitude: null,
    speed: null,
    heading: null,
    accuracy: null,
    startedAt: null,
    lastUpdate: null,
    errorMessage: null,
  };

  private listeners: Set<PatrolListener> = new Set();
  private dispatchListeners: Set<DispatchListener> = new Set();
  private socket: Socket | null = null;
  private locationWatcher: Location.LocationSubscription | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  // ─── ESTADO ──────────────────────────────────────────────────────────

  public getState(): PatrolState {
    return { ...this.state };
  }

  public subscribe(listener: PatrolListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onDispatch(listener: DispatchListener): () => void {
    this.dispatchListeners.add(listener);
    return () => this.dispatchListeners.delete(listener);
  }

  private notify() {
    const snapshot = this.getState();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  private updateState(partial: Partial<PatrolState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  // ─── INICIAR PATRULLA ────────────────────────────────────────────────

  public async startPatrol(): Promise<boolean> {
    if (this.state.isActive) return true;

    // Permisos GPS
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      this.updateState({ errorMessage: 'Permiso de ubicación denegado. Actívalo en Configuración.' });
      return false;
    }

    // Conectar WebSocket
    try {
      await this.connectSocket();
    } catch (err: any) {
      this.updateState({ errorMessage: 'No se pudo conectar al servidor: ' + err.message });
      return false;
    }

    // Iniciar tracking GPS
    this.locationWatcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,      // cada 5 segundos
        distanceInterval: 5,     // o cada 5 metros de movimiento
      },
      (location) => {
        const { latitude, longitude, speed, heading, accuracy } = location.coords;
        const now = new Date().toISOString();

        this.updateState({
          latitude,
          longitude,
          speed,
          heading,
          accuracy,
          lastUpdate: now,
        });

        // Emitir al backend
        this.emitLocation({
          latitude,
          longitude,
          speed,
          heading,
          accuracy,
          status: this.state.status,
          timestamp: now,
        });
      }
    );

    // Heartbeat cada 30s para que el backend sepa que seguimos activos
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('patrol:heartbeat', {
          status: this.state.status,
          timestamp: new Date().toISOString(),
        });
      }
    }, 30000);

    this.updateState({
      isActive: true,
      status: 'available',
      startedAt: new Date().toISOString(),
      errorMessage: null,
    });

    return true;
  }

  // ─── DETENER PATRULLA ────────────────────────────────────────────────

  public async stopPatrol() {
    // Detener GPS
    if (this.locationWatcher) {
      this.locationWatcher.remove();
      this.locationWatcher = null;
    }

    // Detener heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Notificar al backend que salió de patrulla
    if (this.socket?.connected) {
      this.socket.emit('patrol:end', { timestamp: new Date().toISOString() });
    }

    // Desconectar WebSocket
    this.disconnectSocket();

    this.updateState({
      isActive: false,
      status: 'off_duty',
      latitude: null,
      longitude: null,
      speed: null,
      heading: null,
      accuracy: null,
      startedAt: null,
      lastUpdate: null,
      errorMessage: null,
    });
  }

  // ─── CAMBIAR ESTADO ──────────────────────────────────────────────────

  public setStatus(status: PatrolStatus) {
    this.updateState({ status });

    if (this.socket?.connected) {
      this.socket.emit('patrol:status_change', {
        status,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ─── WEBSOCKET ───────────────────────────────────────────────────────

  private async connectSocket() {
    const token = await authService.getToken();
    if (!token) throw new Error('Sin token de autenticación');

    return new Promise<void>((resolve, reject) => {
      this.socket = io(config.API_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 3000,
      });

      const timeout = setTimeout(() => {
        reject(new Error('Timeout de conexión WebSocket'));
      }, 10000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('🚔 [PatrolService] WebSocket conectado:', this.socket?.id);
        this.socket?.emit('patrol:start', { timestamp: new Date().toISOString() });
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('🚔 [PatrolService] WebSocket desconectado:', reason);
      });

      this.socket.on('connect_error', (err) => {
        console.error('🚔 [PatrolService] Error de conexión:', err.message);
        clearTimeout(timeout);
        reject(err);
      });

      // Escuchar comandos del Centro de Mando
      this.socket.on('patrol:command', (data: { action: string; details?: string }) => {
        console.log('🚔 [PatrolService] Comando recibido del Centro:', data);
        if (data.action === 'respond_alert') {
          this.setStatus('responding');
        } else if (data.action === 'return_available') {
          this.setStatus('available');
        }
      });

      // 🚨 Escuchar Despacho Táctico de Emergencia directo desde el Centro de Mando
      this.socket.on('patrol:dispatch', (dispatch: TacticalDispatch) => {
        console.log('🚨 [PatrolService] ¡ALERTA DESPACHADA A TU UNIDAD!', dispatch);
        this.dispatchListeners.forEach((fn) => fn(dispatch));
      });
    });
  }

  private disconnectSocket() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private emitLocation(update: PatrolLocationUpdate) {
    if (this.socket?.connected) {
      this.socket.emit('patrol:location', update);
    }
  }
}

export const patrolService = new PatrolService();
