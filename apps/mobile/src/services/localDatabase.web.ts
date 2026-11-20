import {
  CachedCameraRecord,
  ILocalDatabase,
  LOCAL_DB_STORAGE_KEYS,
  LocalAlertRecord,
} from './localDatabase.types';

export type { LocalAlertRecord, CachedCameraRecord };

const memoryStore = {
  alerts: [] as LocalAlertRecord[],
  cameras: [] as CachedCameraRecord[],
};

function readWebList<T>(key: string, fallback: T[]): T[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [...fallback];
}

function writeWebList<T>(key: string, items: T[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(items));
    }
  } catch {}
}

class LocalDatabaseWeb implements ILocalDatabase {
  public async init(): Promise<void> {
    console.log('🗄️ [LocalDB] Base de datos local activa (Modo Web Storage).');
  }

  public async saveAlert(alert: LocalAlertRecord): Promise<void> {
    memoryStore.alerts.unshift(alert);
    writeWebList(LOCAL_DB_STORAGE_KEYS.ALERTS, memoryStore.alerts);
  }

  public async getAlerts(): Promise<LocalAlertRecord[]> {
    return readWebList(LOCAL_DB_STORAGE_KEYS.ALERTS, memoryStore.alerts);
  }

  public async cacheCameras(cameras: CachedCameraRecord[]): Promise<void> {
    memoryStore.cameras = [...cameras];
    writeWebList(LOCAL_DB_STORAGE_KEYS.CAMERAS, cameras);
  }

  public async getCachedCameras(): Promise<CachedCameraRecord[]> {
    return readWebList(LOCAL_DB_STORAGE_KEYS.CAMERAS, memoryStore.cameras);
  }
}

export const localDatabase = new LocalDatabaseWeb();
