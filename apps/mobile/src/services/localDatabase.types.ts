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

export interface ILocalDatabase {
  init(): Promise<void>;
  saveAlert(alert: LocalAlertRecord): Promise<void>;
  getAlerts(): Promise<LocalAlertRecord[]>;
  cacheCameras(cameras: CachedCameraRecord[]): Promise<void>;
  getCachedCameras(): Promise<CachedCameraRecord[]>;
}

export const LOCAL_DB_STORAGE_KEYS = {
  ALERTS: 'rc_local_alerts',
  CAMERAS: 'rc_cached_cameras',
} as const;
