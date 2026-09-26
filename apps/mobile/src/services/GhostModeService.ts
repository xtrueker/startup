import * as Haptics from 'expo-haptics';
import { VolumeManager } from 'react-native-volume-manager';

export type VolumeKey = 'UP' | 'DOWN';

export interface GhostModeTriggerEvent {
  sequence: VolumeKey[];
  timestamp: number;
}

export type GhostModeCallback = (event: GhostModeTriggerEvent) => void | Promise<void>;

class GhostModeService {
  private keyBuffer: { key: VolumeKey; timestamp: number }[] = [];
  private readonly MAX_WINDOW_MS = 2500; // Ventana máxima para completar la secuencia (2.5 segundos)
  private readonly MIN_PRESS_INTERVAL_MS = 60; // Anti-rebote para evitar doble lectura por fluctuación
  private lastPressTimestamp: number = 0;
  private lastVolume: number = -1;
  private volumeListener: any = null;
  private isListeningActive = false;

  // Secuencias válidas que disparan el modo sigiloso:
  // 1. Presionar Bajar Volumen 3 veces seguidas (ejemplo principal del requerimiento)
  // 2. Secuencia táctica alternativa DOWN -> UP -> DOWN
  private readonly TRIGGER_SEQUENCES: VolumeKey[][] = [
    ['DOWN', 'DOWN', 'DOWN'],
    ['DOWN', 'UP', 'DOWN'],
  ];

  // Callback cuando se activa el modo fantasma
  private onTriggeredCallback: GhostModeCallback | null = null;

  public setOnTriggered(callback: GhostModeCallback) {
    this.onTriggeredCallback = callback;
  }

  public isListening(): boolean {
    return this.isListeningActive;
  }

  /**
   * Inicia la escucha de eventos de volumen físicos en segundo plano
   */
  public async startListening(): Promise<void> {
    if (this.isListeningActive) return;

    try {
      const initial = await VolumeManager.getVolume();
      this.lastVolume = typeof initial?.volume === 'number' ? initial.volume : 0.5;
    } catch (e) {
      this.lastVolume = 0.5;
    }

    try {
      this.volumeListener = VolumeManager.addVolumeListener((result) => {
        const currentVolume = typeof result?.volume === 'number' ? result.volume : this.lastVolume;
        const now = Date.now();

        // Evitar dobles lecturas ultra-rápidas por rebote
        if (now - this.lastPressTimestamp < this.MIN_PRESS_INTERVAL_MS) {
          return;
        }

        if (currentVolume < this.lastVolume) {
          this.registerKeyPress('DOWN');
        } else if (currentVolume > this.lastVolume) {
          this.registerKeyPress('UP');
        } else {
          // Borde límite: Si el volumen ya estaba en el mínimo (cercano a 0) y el usuario
          // presiona bajar volumen, el valor numérico no cambia pero el sistema dispara el listener.
          if (this.lastVolume <= 0.05) {
            this.registerKeyPress('DOWN');
          } else if (this.lastVolume >= 0.95) {
            this.registerKeyPress('UP');
          } else {
            // Si está a la mitad y se disparó el evento sin cambio numérico, inferir DOWN como seguro
            this.registerKeyPress('DOWN');
          }
        }

        this.lastVolume = currentVolume;
        this.lastPressTimestamp = now;
      });

      this.isListeningActive = true;
      console.log('👻 [GhostModeService] Escucha táctica de botones de volumen armada.');
    } catch (listenerError) {
      console.warn('[GhostModeService] No se pudo inicializar listener nativo de volumen:', listenerError);
    }
  }

  public stopListening() {
    if (this.volumeListener) {
      try {
        if (typeof this.volumeListener.remove === 'function') {
          this.volumeListener.remove();
        }
      } catch (err) {
        console.warn('[GhostModeService] Error removiendo listener:', err);
      }
      this.volumeListener = null;
    }
    this.keyBuffer = [];
    this.isListeningActive = false;
    console.log('👻 [GhostModeService] Escucha táctica detenida.');
  }

  /**
   * Registra una pulsación física en el buffer circular
   */
  public registerKeyPress(key: VolumeKey) {
    const now = Date.now();

    // Limpiar eventos que ya excedieron la ventana de tiempo
    this.keyBuffer = this.keyBuffer.filter(
      (item) => now - item.timestamp <= this.MAX_WINDOW_MS
    );

    // Añadir al buffer
    this.keyBuffer.push({ key, timestamp: now });

    // Mantener como máximo los últimos 3 eventos
    if (this.keyBuffer.length > 3) {
      this.keyBuffer.shift();
    }

    console.log(`👻 [GhostModeService] Clave detectada: ${key} (Buffer: ${this.keyBuffer.map((k) => k.key).join(' -> ')})`);
    this.evaluateSequence();
  }

  /**
   * Evalúa si las últimas pulsaciones coinciden con alguna secuencia de pánico
   */
  private evaluateSequence() {
    if (this.keyBuffer.length < 3) return;

    const firstPress = this.keyBuffer[0].timestamp;
    const lastPress = this.keyBuffer[this.keyBuffer.length - 1].timestamp;
    const timeDiff = lastPress - firstPress;

    if (timeDiff > this.MAX_WINDOW_MS) {
      // Excedió el tiempo permitido
      this.keyBuffer.shift();
      return;
    }

    const currentSequence = this.keyBuffer.map((k) => k.key);

    const matchesSequence = this.TRIGGER_SEQUENCES.some((targetSeq) => {
      if (currentSequence.length !== targetSeq.length) return false;
      return targetSeq.every((key, idx) => key === currentSequence[idx]);
    });

    if (matchesSequence) {
      console.log('🚨 [GhostModeService] ¡Secuencia de Pánico Sigiloso Verificada!');
      this.triggerGhostMode([...currentSequence]);
    }
  }

  /**
   * Dispara el modo fantasma con confirmación háptica ciega
   */
  public async triggerGhostMode(detectedSequence: VolumeKey[] = ['DOWN', 'DOWN', 'DOWN']) {
    // Vaciar el buffer para evitar repeticiones accidentales
    this.keyBuffer = [];

    // Confirmación Ciega para el ciudadano en su bolsillo: 2 pulsos hápticos pesados
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(async () => {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (_) {}

        // Ejecutar callback
        if (this.onTriggeredCallback) {
          try {
            await this.onTriggeredCallback({
              sequence: detectedSequence,
              timestamp: Date.now(),
            });
          } catch (callbackErr) {
            console.error('[GhostModeService] Error en callback onTriggered:', callbackErr);
          }
        }
      }, 180);
    } catch (hapticErr) {
      // Fallback si el dispositivo no soporta haptics
      if (this.onTriggeredCallback) {
        this.onTriggeredCallback({
          sequence: detectedSequence,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Permite probar la detonación del modo fantasma en emuladores o pruebas unitarias
   */
  public simulateTrigger() {
    return this.triggerGhostMode(['DOWN', 'DOWN', 'DOWN']);
  }
}

export const ghostModeService = new GhostModeService();
