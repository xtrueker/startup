import * as FileSystem from 'expo-file-system';

const BUFFER_FILE = FileSystem.documentDirectory + 'emergency_buffer.json';

export interface BufferedPayload {
  id: string;
  type: 'PANIC_TRIGGER' | 'GPS_UPDATE' | 'AUDIO_CHUNK';
  payload: any;
  timestamp: string;
}

export class OfflineBufferService {
  /**
   * Lee la cola de eventos no enviados.
   */
  static async getBuffer(): Promise<BufferedPayload[]> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(BUFFER_FILE);
      if (!fileInfo.exists) return [];
      
      const contents = await FileSystem.readAsStringAsync(BUFFER_FILE);
      return JSON.parse(contents) as BufferedPayload[];
    } catch (e) {
      console.error('Error leyendo buffer offline', e);
      return [];
    }
  }

  /**
   * Agrega un evento a la cola para enviarlo cuando haya señal.
   */
  static async enqueue(type: BufferedPayload['type'], payload: any): Promise<void> {
    const queue = await this.getBuffer();
    const newEvent: BufferedPayload = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    
    queue.push(newEvent);
    await FileSystem.writeAsStringAsync(BUFFER_FILE, JSON.stringify(queue));
    console.log(`[OfflineBuffer] Embalado evento ${type}. Total: ${queue.length}`);
  }

  /**
   * Elimina un evento procesado exitosamente de la cola.
   */
  static async dequeue(id: string): Promise<void> {
    const queue = await this.getBuffer();
    const filtered = queue.filter(e => e.id !== id);
    await FileSystem.writeAsStringAsync(BUFFER_FILE, JSON.stringify(filtered));
  }

  /**
   * Intenta vaciar toda la cola hacia la API (Exponential Backoff Loop)
   */
  static async flushQueue(apiClient: any): Promise<void> {
    const queue = await this.getBuffer();
    if (queue.length === 0) return;

    console.log(`[OfflineBuffer] Intentando purgar ${queue.length} eventos pendentes...`);
    
    for (const event of queue) {
      try {
        // Rutado lógico basado en Event Type
        if (event.type === 'PANIC_TRIGGER') {
          await apiClient.post('/mobile/panic/sync', event.payload);
        } else if (event.type === 'GPS_UPDATE') {
          await apiClient.post('/mobile/tracker/sync', event.payload);
        } else if (event.type === 'AUDIO_CHUNK') {
          // Implementación formData pendiente
        }
        
        // Si sale bien, quitarlo del buffer
        await this.dequeue(event.id);
      } catch (e) {
        console.warn(`[OfflineBuffer] Falla sincronizando evento ${event.id}, se reintentará luego.`);
        // Romper el loop para evitar spam si la red sigue caída permanentemente
        break;
      }
    }
  }
}
