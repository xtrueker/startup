export interface LocalAlertRecord {
  id: string;
  alertId?: string;
  triggerType: string;
  latitude: number;
  longitude: number;
  address: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface CachedCameraRecord {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  streamUrl?: string;
  status: string;
}

const memoryStore = {
  alerts: [] as LocalAlertRecord[],
  cameras: [] as CachedCameraRecord[],
};

class LocalDatabaseWeb {
  public async init(): Promise<void> {
    console.log('🗄️ [LocalDB] Base de datos local activa (Modo Web Storage).');
  }

  public async saveAlert(alert: LocalAlertRecord): Promise<void> {
    memoryStore.alerts.unshift(alert);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('rc_local_alerts', JSON.stringify(memoryStore.alerts));
      }
    } catch (_) {}
  }

  public async getAlerts(): Promise<LocalAlertRecord[]> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('rc_local_alerts');
        if (stored) return JSON.parse(stored);
      }
    } catch (_) {}
    return [...memoryStore.alerts];
  }

  public async cacheCameras(cameras: CachedCameraRecord[]): Promise<void> {
    memoryStore.cameras = [...cameras];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('rc_cached_cameras', JSON.stringify(cameras));
      }
    } catch (_) {}
  }

  public async getCachedCameras(): Promise<CachedCameraRecord[]> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('rc_cached_cameras');
        if (stored) return JSON.parse(stored);
      }
    } catch (_) {}
    return [...memoryStore.cameras];
  }
}

export const localDatabase = new LocalDatabaseWeb();
