import * as FileSystem from 'expo-file-system/legacy';

const BUFFER_FILE = (FileSystem.documentDirectory ?? '') + 'emergency_buffer.json';

export interface BufferedPayload {
  id: string;
  type: 'PANIC_TRIGGER' | 'GPS_UPDATE' | 'AUDIO_CHUNK';
  payload: any;
  timestamp: string;
}

// Respaldo en memoria por si el sistema de archivos del SO está bloqueado
let memoryQueue: BufferedPayload[] = [];

export class OfflineBufferService {
  /**
   * Lee la cola de eventos no enviados.
   */
  static async getBuffer(): Promise<BufferedPayload[]> {
    try {
      if (FileSystem.documentDirectory) {
        const fileInfo = await FileSystem.getInfoAsync(BUFFER_FILE);
        if (fileInfo.exists) {
          const contents = await FileSystem.readAsStringAsync(BUFFER_FILE);
          const parsed = JSON.parse(contents) as BufferedPayload[];
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {
      console.warn('[OfflineBuffer] Error leyendo archivo de buffer, usando memoria:', e);
    }
    return [...memoryQueue];
  }

  /**
   * Agrega un evento a la cola para enviarlo cuando haya señal.
   */
  static async enqueue(type: BufferedPayload['type'], payload: any): Promise<void> {
    const newEvent: BufferedPayload = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    memoryQueue.push(newEvent);

    try {
      if (FileSystem.documentDirectory) {
        const queue = await this.getBuffer();
        // Evitar duplicados en disco
        if (!queue.some((e) => e.id === newEvent.id)) {
          queue.push(newEvent);
        }
        await FileSystem.writeAsStringAsync(BUFFER_FILE, JSON.stringify(queue));
      }
      console.log(`[OfflineBuffer] Embalado evento ${type}. Total en cola: ${memoryQueue.length}`);
    } catch (err) {
      console.warn('[OfflineBuffer] No se pudo escribir en disco, retenido en memoria:', err);
    }
  }

  /**
   * Elimina un evento procesado exitosamente de la cola.
   */
  static async dequeue(id: string): Promise<void> {
    memoryQueue = memoryQueue.filter((e) => e.id !== id);

    try {
      if (FileSystem.documentDirectory) {
        const queue = await this.getBuffer();
        const filtered = queue.filter((e) => e.id !== id);
        await FileSystem.writeAsStringAsync(BUFFER_FILE, JSON.stringify(filtered));
      }
    } catch (err) {
      console.warn('[OfflineBuffer] Error actualizando cola en disco tras dequeue:', err);
    }
  }

  /**
   * Intenta vaciar toda la cola hacia la API (Exponential Backoff Loop)
   */
  static async flushQueue(apiClient: any): Promise<void> {
    const queue = await this.getBuffer();
    if (queue.length === 0) return;

    console.log(`[OfflineBuffer] Intentando purgar ${queue.length} eventos pendientes...`);

    for (const event of queue) {
      try {
        if (event.type === 'PANIC_TRIGGER') {
          await apiClient.post('/mobile/panic', event.payload);
        } else if (event.type === 'GPS_UPDATE') {
          await apiClient.post('/mobile/location', event.payload);
        }

        // Si se envió bien, retirarlo
        await this.dequeue(event.id);
      } catch (e) {
        console.warn(`[OfflineBuffer] Falla sincronizando evento ${event.id}, se reintentará luego.`);
        break;
      }
    }
  }
}
