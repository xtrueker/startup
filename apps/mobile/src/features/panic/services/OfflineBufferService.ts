import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const BUFFER_FILE = (FileSystem.documentDirectory ?? '') + 'emergency_buffer.json';
const WEB_STORAGE_KEY = 'rc_emergency_offline_buffer_v2';

export interface BufferedPayload {
  id: string;
  type: 'PANIC_TRIGGER' | 'GPS_UPDATE' | 'AUDIO_CHUNK';
  payload: any;
  timestamp: string;
}

let memoryQueue: BufferedPayload[] = [];
let syncTimer: ReturnType<typeof setInterval> | null = null;
let isFlushing = false;

export class OfflineBufferService {
  private static async persistQueue(queue: BufferedPayload[]): Promise<void> {
    memoryQueue = [...queue];

    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(queue));
        }
      } catch {
        // Ignore storage quota errors
      }
      return;
    }

    try {
      if (FileSystem.documentDirectory) {
        await FileSystem.writeAsStringAsync(BUFFER_FILE, JSON.stringify(queue));
      }
    } catch (err) {
      console.warn('[OfflineBuffer] No se pudo persistir cola en disco:', err);
    }
  }

  static async getBuffer(): Promise<BufferedPayload[]> {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(WEB_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              memoryQueue = parsed;
              return parsed;
            }
          }
        }
      } catch {
        // Fallback to memory
      }
      return [...memoryQueue];
    }

    try {
      if (FileSystem.documentDirectory) {
        const fileInfo = await FileSystem.getInfoAsync(BUFFER_FILE);
        if (fileInfo.exists) {
          const contents = await FileSystem.readAsStringAsync(BUFFER_FILE);
          const parsed = JSON.parse(contents) as BufferedPayload[];
          if (Array.isArray(parsed)) {
            memoryQueue = parsed;
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[OfflineBuffer] Error leyendo archivo de buffer:', e);
    }
    return [...memoryQueue];
  }

  static async enqueue(type: BufferedPayload['type'], payload: any): Promise<void> {
    const newEvent: BufferedPayload = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    const queue = await this.getBuffer();
    queue.push(newEvent);
    await this.persistQueue(queue);
    console.log(`[OfflineBuffer] Encolado ${type}. Pendientes: ${queue.length}`);
  }

  static async dequeue(id: string): Promise<void> {
    const queue = await this.getBuffer();
    const filtered = queue.filter((e) => e.id !== id);
    await this.persistQueue(filtered);
  }

  /**
   * Vacía la cola offline en orden cronológico estricto:
   * 1. Si un PANIC_TRIGGER local (OFFLINE_xxx) obtiene UUID real en el servidor,
   *    re-vincula todos los GPS_UPDATE y AUDIO_CHUNK siguientes a ese nuevo alertId.
   * 2. Transmite fragmentos AUDIO_CHUNK leyendo base64 de disco o memoria hacia /mobile/evidence/audio.
   */
  static async flushQueue(apiClient: any): Promise<void> {
    if (isFlushing) return;
    isFlushing = true;

    try {
      const queue = await this.getBuffer();
      if (queue.length === 0) return;

      const offlineIdMap = new Map<string, string>();

      for (const event of queue) {
        try {
          if (event.type === 'PANIC_TRIGGER') {
            const tempAlertId: string | undefined = event.payload?.tempAlertId;
            const res = await apiClient.post('/mobile/panic', event.payload);
            const realAlertId: string | undefined = res.data?.data?.alertId;
            if (tempAlertId && realAlertId) {
              offlineIdMap.set(tempAlertId, realAlertId);
            }
          } else if (event.type === 'GPS_UPDATE') {
            const mappedAlertId =
              offlineIdMap.get(event.payload?.alertId) || event.payload?.alertId;
            if (mappedAlertId && !String(mappedAlertId).startsWith('OFFLINE_')) {
              await apiClient.post('/mobile/location', {
                ...event.payload,
                alertId: mappedAlertId,
              });
            } else {
              continue;
            }
          } else if (event.type === 'AUDIO_CHUNK') {
            const mappedAlertId =
              offlineIdMap.get(event.payload?.alertId) || event.payload?.alertId;
            if (!mappedAlertId || String(mappedAlertId).startsWith('OFFLINE_')) {
              continue;
            }

            let audioBase64: string | null = event.payload?.audioBase64 || null;
            const fileUri: string | undefined = event.payload?.fileUri;

            if (!audioBase64 && fileUri && Platform.OS !== 'web') {
              const info = await FileSystem.getInfoAsync(fileUri);
              if (info.exists) {
                audioBase64 = await FileSystem.readAsStringAsync(fileUri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
              }
            }

            if (audioBase64) {
              await apiClient.post('/mobile/evidence/audio', {
                alertId: mappedAlertId,
                audioBase64,
                mimeType: event.payload?.mimeType || 'audio/mp4',
                chunkIndex: event.payload?.chunkIndex ?? 0,
                durationMs: event.payload?.durationMs ?? 15000,
              });

              if (fileUri && Platform.OS !== 'web') {
                FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
              }
            }
          }

          await this.dequeue(event.id);
        } catch (err) {
          console.warn(`[OfflineBuffer] Sin red al sincronizar ${event.type}, reintentará luego.`);
          break;
        }
      }
    } finally {
      isFlushing = false;
    }
  }

  /**
   * Inicia sincronización automática en segundo plano cada 15 segundos.
   */
  static startAutoSync(apiClient: any): () => void {
    if (syncTimer) clearInterval(syncTimer);
    this.flushQueue(apiClient).catch(() => {});

    syncTimer = setInterval(() => {
      this.flushQueue(apiClient).catch(() => {});
    }, 15000);

    return () => {
      if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
      }
    };
  }
}
