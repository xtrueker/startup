import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { config } from '../../../config';

const BUFFER_FILE = (FileSystem.documentDirectory ?? '') + 'emergency_buffer.json';
const RESOLVED_MAP_FILE = (FileSystem.documentDirectory ?? '') + 'emergency_resolved_ids.json';
const WEB_STORAGE_KEY = 'rc_emergency_offline_buffer_v2';
const WEB_RESOLVED_MAP_KEY = 'rc_emergency_resolved_ids_v1';

export interface BufferedPayload {
  id: string;
  type: 'PANIC_TRIGGER' | 'GPS_UPDATE' | 'AUDIO_CHUNK';
  payload: any;
  timestamp: string;
}

type AlertResolvedListener = (tempAlertId: string, realAlertId: string) => void;

let memoryQueue: BufferedPayload[] = [];
let resolvedAlertMap: Record<string, string> = {};
let resolvedMapLoaded = false;
const cancelledTempIds = new Set<string>();
const resolvedListeners = new Set<AlertResolvedListener>();
let syncTimer: ReturnType<typeof setInterval> | null = null;
let isFlushing = false;

async function readJsonStore<T>(webKey: string, nativeFilePath: string): Promise<T | null> {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(webKey);
        if (raw) return JSON.parse(raw) as T;
      }
    } catch {}
    return null;
  }

  try {
    if (FileSystem.documentDirectory) {
      const info = await FileSystem.getInfoAsync(nativeFilePath);
      if (info.exists) {
        const raw = await FileSystem.readAsStringAsync(nativeFilePath);
        return JSON.parse(raw) as T;
      }
    }
  } catch {}
  return null;
}

async function writeJsonStore(
  webKey: string,
  nativeFilePath: string,
  data: unknown
): Promise<void> {
  const serialized = JSON.stringify(data);
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(webKey, serialized);
      }
    } catch {}
    return;
  }

  try {
    if (FileSystem.documentDirectory) {
      await FileSystem.writeAsStringAsync(nativeFilePath, serialized);
    }
  } catch (err) {
    console.warn('[OfflineBuffer] No se pudo persistir almacenamiento en disco:', err);
  }
}

function deleteNativeAudioFile(fileUri?: string): void {
  if (fileUri && Platform.OS !== 'web') {
    FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
  }
}

export class OfflineBufferService {
  static isTemporaryAlertId(alertId: unknown): boolean {
    return (
      typeof alertId === 'string' &&
      (alertId.startsWith('OFFLINE_') || alertId.startsWith('LOCAL_BUFFER_'))
    );
  }

  static onAlertResolved(listener: AlertResolvedListener): () => void {
    resolvedListeners.add(listener);
    return () => {
      resolvedListeners.delete(listener);
    };
  }

  private static notifyAlertResolved(tempAlertId: string, realAlertId: string): void {
    resolvedListeners.forEach((fn) => {
      try {
        fn(tempAlertId, realAlertId);
      } catch (err) {
        console.warn('[OfflineBuffer] Error en listener onAlertResolved:', err);
      }
    });
  }

  private static async ensureResolvedMapLoaded(): Promise<void> {
    if (resolvedMapLoaded) return;
    resolvedMapLoaded = true;

    const parsed = await readJsonStore<Record<string, string>>(
      WEB_RESOLVED_MAP_KEY,
      RESOLVED_MAP_FILE
    );
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      resolvedAlertMap = { ...parsed, ...resolvedAlertMap };
    }
  }

  private static async persistResolvedMap(): Promise<void> {
    const entries = Object.entries(resolvedAlertMap);
    if (entries.length > 50) {
      resolvedAlertMap = Object.fromEntries(entries.slice(entries.length - 50));
    }
    await writeJsonStore(WEB_RESOLVED_MAP_KEY, RESOLVED_MAP_FILE, resolvedAlertMap);
  }

  static resolveAlertId(alertId: string | null | undefined): string | null {
    if (!alertId) return null;
    return resolvedAlertMap[alertId] || alertId;
  }

  /**
   * Purga de la cola offline todos los eventos ligados a una alerta cancelada localmente
   * y devuelve el UUID real si el disparo ya había alcanzado a sincronizarse en background.
   */
  static async purgeOfflineAlert(alertId: string): Promise<string | null> {
    await this.ensureResolvedMapLoaded();
    if (this.isTemporaryAlertId(alertId)) {
      cancelledTempIds.add(alertId);
    }

    const syncedRealId = resolvedAlertMap[alertId] || null;
    const queue = await this.getBuffer();
    const remaining: BufferedPayload[] = [];

    for (const item of queue) {
      const itemTempId = item.payload?.tempAlertId;
      const itemAlertId = item.payload?.alertId;
      const matchesTarget =
        itemTempId === alertId ||
        itemAlertId === alertId ||
        (syncedRealId !== null && itemAlertId === syncedRealId);

      if (matchesTarget) {
        if (item.type === 'AUDIO_CHUNK') {
          deleteNativeAudioFile(item.payload?.fileUri);
        }
        continue;
      }
      remaining.push(item);
    }

    if (remaining.length !== queue.length) {
      await this.persistQueue(remaining);
    }

    return syncedRealId;
  }

  private static async persistQueue(queue: BufferedPayload[]): Promise<void> {
    memoryQueue = [...queue];
    await writeJsonStore(WEB_STORAGE_KEY, BUFFER_FILE, queue);
  }

  static async getBuffer(): Promise<BufferedPayload[]> {
    const parsed = await readJsonStore<BufferedPayload[]>(WEB_STORAGE_KEY, BUFFER_FILE);
    if (Array.isArray(parsed)) {
      memoryQueue = parsed;
      return parsed;
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
      await this.ensureResolvedMapLoaded();
      const queue = await this.getBuffer();
      if (queue.length === 0) return;

      for (const event of queue) {
        try {
          if (event.type === 'PANIC_TRIGGER') {
            const tempAlertId: string | undefined = event.payload?.tempAlertId;
            if (tempAlertId && cancelledTempIds.has(tempAlertId)) {
              await this.dequeue(event.id);
              continue;
            }

            const res = await apiClient.post('/mobile/panic', event.payload);
            const realAlertId: string | undefined = res.data?.data?.alertId;

            if (tempAlertId && cancelledTempIds.has(tempAlertId)) {
              if (realAlertId) {
                apiClient.patch(`/mobile/alerts/${realAlertId}/cancel`).catch(() => {});
              }
              await this.dequeue(event.id);
              continue;
            }

            if (tempAlertId && realAlertId) {
              resolvedAlertMap[tempAlertId] = realAlertId;
              await this.persistResolvedMap();
              this.notifyAlertResolved(tempAlertId, realAlertId);
            }
          } else if (event.type === 'GPS_UPDATE') {
            const rawAlertId: string | undefined = event.payload?.alertId;
            if (rawAlertId && cancelledTempIds.has(rawAlertId)) {
              await this.dequeue(event.id);
              continue;
            }

            const mappedAlertId = this.resolveAlertId(rawAlertId);
            if (mappedAlertId && !this.isTemporaryAlertId(mappedAlertId)) {
              await apiClient.post('/mobile/location', {
                ...event.payload,
                alertId: mappedAlertId,
              });
            } else {
              continue;
            }
          } else if (event.type === 'AUDIO_CHUNK') {
            const rawAlertId: string | undefined = event.payload?.alertId;
            const fileUri: string | undefined = event.payload?.fileUri;

            if (rawAlertId && cancelledTempIds.has(rawAlertId)) {
              deleteNativeAudioFile(fileUri);
              await this.dequeue(event.id);
              continue;
            }

            const mappedAlertId = this.resolveAlertId(rawAlertId);
            if (!mappedAlertId || this.isTemporaryAlertId(mappedAlertId)) {
              continue;
            }

            let audioBase64: string | null = event.payload?.audioBase64 || null;

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
                durationMs: event.payload?.durationMs ?? config.AUDIO_CHUNK_DURATION_MS,
              });

              deleteNativeAudioFile(fileUri);
            }
          }

          await this.dequeue(event.id);
        } catch (err: any) {
          const httpStatus: number | undefined = err?.response?.status;
          // Si el servidor rechaza permanentemente un evento inválido/no autorizado (400/403/404/422),
          // descartarlo para evitar bloquear indefinidamente los eventos siguientes en la cola offline.
          if (httpStatus && [400, 403, 404, 422].includes(httpStatus)) {
            if (event.type === 'AUDIO_CHUNK') {
              deleteNativeAudioFile(event.payload?.fileUri);
            }
            await this.dequeue(event.id);
            console.warn(
              `[OfflineBuffer] Evento ${event.type} descartado por rechazo definitivo HTTP ${httpStatus}.`
            );
            continue;
          }
          console.warn(`[OfflineBuffer] Sin red al sincronizar ${event.type}, reintentará luego.`);
          break;
        }
      }
    } finally {
      isFlushing = false;
    }
  }

  /**
   * Inicia sincronización automática en segundo plano.
   */
  static startAutoSync(apiClient: any): () => void {
    if (syncTimer) clearInterval(syncTimer);
    this.flushQueue(apiClient).catch(() => {});

    syncTimer = setInterval(() => {
      this.flushQueue(apiClient).catch(() => {});
    }, config.OFFLINE_SYNC_INTERVAL_MS);

    return () => {
      if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
      }
    };
  }
}
