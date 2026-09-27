import { Platform } from 'react-native';

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

let dbInstance: any = null;
let isInitialized = false;

// Almacén en memoria como respaldo resiliente para Web o entornos sin soporte SQLite nativo
const memoryStore = {
  alerts: [] as LocalAlertRecord[],
  cameras: [] as CachedCameraRecord[],
  offlineEvents: [] as any[],
};

class LocalDatabaseService {
  /**
   * Inicializa la base de datos local SQLite (o memoria en web)
   */
  public async init(): Promise<void> {
    if (isInitialized) return;

    if (Platform.OS === 'web') {
      console.log('🗄️ [LocalDB] Base de datos local inicializada en modo Web Storage.');
      isInitialized = true;
      return;
    }

    try {
      // Importación dinámica segura para evitar fallos en compiladores web
      const SQLite = require('expo-sqlite');
      if (typeof SQLite.openDatabaseSync === 'function') {
        dbInstance = SQLite.openDatabaseSync('red_ciudadana_local.db');

        // Crear tablas de contingencia y persistencia móvil
        dbInstance.execSync(`
          CREATE TABLE IF NOT EXISTS local_alerts (
            id TEXT PRIMARY KEY,
            alert_id TEXT,
            trigger_type TEXT,
            latitude REAL,
            longitude REAL,
            address TEXT,
            description TEXT,
            status TEXT,
            created_at TEXT
          );

          CREATE TABLE IF NOT EXISTS cached_cameras (
            id TEXT PRIMARY KEY,
            name TEXT,
            latitude REAL,
            longitude REAL,
            stream_url TEXT,
            status TEXT,
            updated_at TEXT
          );

          CREATE TABLE IF NOT EXISTS offline_events (
            id TEXT PRIMARY KEY,
            type TEXT,
            payload TEXT,
            timestamp TEXT,
            synced INTEGER DEFAULT 0
          );
        `);
        console.log('🗄️ [LocalDB] Base de datos SQLite móvil inicializada con éxito.');
      }
    } catch (err) {
      console.warn('⚠️ [LocalDB] SQLite nativo no disponible en este runtime, usando almacén en memoria:', err);
    } finally {
      isInitialized = true;
    }
  }

  /**
   * Guarda una alerta disparada en la base de datos local
   */
  public async saveAlert(alert: LocalAlertRecord): Promise<void> {
    await this.init();

    if (dbInstance) {
      try {
        dbInstance.runSync(
          `INSERT OR REPLACE INTO local_alerts (id, alert_id, trigger_type, latitude, longitude, address, description, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            alert.id,
            alert.alertId || '',
            alert.triggerType,
            alert.latitude,
            alert.longitude,
            alert.address,
            alert.description,
            alert.status,
            alert.createdAt,
          ]
        );
        return;
      } catch (e) {
        console.warn('[LocalDB] Error guardando alerta en SQLite:', e);
      }
    }

    // Fallback memoria
    memoryStore.alerts.unshift(alert);
  }

  /**
   * Obtiene el historial de alertas locales guardadas
   */
  public async getAlerts(): Promise<LocalAlertRecord[]> {
    await this.init();

    if (dbInstance) {
      try {
        const rows = dbInstance.getAllSync(
          'SELECT * FROM local_alerts ORDER BY created_at DESC LIMIT 50'
        );
        return rows.map((r: any) => ({
          id: r.id,
          alertId: r.alert_id,
          triggerType: r.trigger_type,
          latitude: r.latitude,
          longitude: r.longitude,
          address: r.address,
          description: r.description,
          status: r.status,
          createdAt: r.created_at,
        }));
      } catch (e) {
        console.warn('[LocalDB] Error leyendo alertas de SQLite:', e);
      }
    }

    return [...memoryStore.alerts];
  }

  /**
   * Guarda un lote de cámaras de seguridad en la base de datos local
   */
  public async cacheCameras(cameras: CachedCameraRecord[]): Promise<void> {
    await this.init();

    if (dbInstance) {
      try {
        const now = new Date().toISOString();
        for (const cam of cameras) {
          dbInstance.runSync(
            `INSERT OR REPLACE INTO cached_cameras (id, name, latitude, longitude, stream_url, status, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [cam.id, cam.name, cam.latitude, cam.longitude, cam.streamUrl || '', cam.status, now]
          );
        }
        return;
      } catch (e) {
        console.warn('[LocalDB] Error guardando cámaras en SQLite:', e);
      }
    }

    memoryStore.cameras = [...cameras];
  }

  /**
   * Obtiene las cámaras de seguridad cacheadas localmente
   */
  public async getCachedCameras(): Promise<CachedCameraRecord[]> {
    await this.init();

    if (dbInstance) {
      try {
        const rows = dbInstance.getAllSync('SELECT * FROM cached_cameras');
        return rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          latitude: r.latitude,
          longitude: r.longitude,
          streamUrl: r.stream_url,
          status: r.status,
        }));
      } catch (e) {
        console.warn('[LocalDB] Error leyendo cámaras de SQLite:', e);
      }
    }

    return [...memoryStore.cameras];
  }
}

export const localDatabase = new LocalDatabaseService();
