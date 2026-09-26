import { Camera } from '../infrastructure/database/models/Camera';
import { logger } from '../shared/utils/logger';

export interface CitizenCamera {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rtspUrl: string;
}

/**
 * Fórmula de Haversine para calcular distancia en metros entre dos coordenadas GPS
 */
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Radio de la tierra en metros
  const φ1 = lat1 * Math.PI/180; // φ, λ en radianes
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
}

class PredictiveEngine {
  /**
   * Recibe la baliza GPS en vivo de una víctima en Modo Fantasma 
   * y devuelve las cámaras ciudadanas más cercanas (radio de 200m).
   */
  public async getNearbyCameras(victimLat: number, victimLng: number, radiusMeters: number = 200): Promise<CitizenCamera[]> {
    try {
      const dbCameras = await Camera.find();
      const mappedCameras: CitizenCamera[] = dbCameras.map((cam: any) => {
        let lat = 0, lng = 0;
        if (typeof cam.location === 'string') {
          const match = cam.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
          if (match) {
            lng = parseFloat(match[1]);
            lat = parseFloat(match[2]);
          }
        }
        return {
          id: cam.id,
          name: cam.name,
          lat,
          lng,
          rtspUrl: cam.stream_url || cam.streamUrl || ''
        };
      });

      const nearbyCameras = mappedCameras.filter(cam => {
        const distance = getDistanceInMeters(victimLat, victimLng, cam.lat, cam.lng);
        return distance <= radiusMeters;
      });

      if (nearbyCameras.length > 0) {
        logger.info(`🎯 Motor Predictivo: ${nearbyCameras.length} cámaras armadas en radio de ${radiusMeters}m de la víctima.`);
      }

      return nearbyCameras;
    } catch (err) {
      logger.error(err as Error, 'Error in PredictiveEngine.getNearbyCameras:');
      return [];
    }
  }
}

export const predictiveEngine = new PredictiveEngine();
