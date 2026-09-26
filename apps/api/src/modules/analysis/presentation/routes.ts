import { Router, Request, Response } from 'express';
import * as turf from '@turf/turf';
import Alert from '../../../infrastructure/database/models/Alert';
import { requireAuth, requireRole } from '../../../shared/middlewares/auth';

const router = Router();

// GET /api/analysis/hotspots
// Devuelve una agregación de incidentes históricos para Heatmaps
router.get('/hotspots', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (_req: Request, res: Response) => {
  console.log('INFO: GET /api/analysis/hotspots called');
  try {
    // Retornamos todas las activas por ahora para el heatmap (hasta tener la API de históricos lista)
    const incidents = await Alert.findActive(100);
    
    // Devolvemos el array de coordenadas [lat, lng, weight] para el Heatmap de Leaflet
    const heatmapData = incidents.map((inc: any) => {
      let lat = 0, lng = 0;
      if (inc.location && typeof inc.location === 'object' && inc.location.coordinates) {
         lng = inc.location.coordinates[0];
         lat = inc.location.coordinates[1];
      } else if (typeof inc.location === 'string') {
         const match = inc.location.match(/POINT\(([^ ]+) ([^)]+)\)/);
         if (match) {
           lng = parseFloat(match[1]);
           lat = parseFloat(match[2]);
         }
      }
      return [lat, lng, 1]; // lat, lng, peso base
    });

    res.json({
      success: true,
      count: incidents.length,
      data: heatmapData
    });
  } catch (error: any) {
    console.error('ERROR obteniendo hotspots:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener zonas calientes',
      error: error.message
    });
  }
});

// GET /api/analysis/reachability
// Estima la zona de alcance de un sospechoso (Isochrone simple usando Buffer de Turf)
router.get('/reachability', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (req: Request, res: Response) => {
  console.log('INFO: GET /api/analysis/reachability called');
  try {
    const { lat, lng, mode, minutes } = req.query;

    if (!lat || !lng || !mode || !minutes) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros: lat, lng, mode, minutes',
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const mins = parseFloat(minutes as string);

    // Velocidades estimadas en km/h
    const speeds: Record<string, number> = {
      caminando: 5,
      bicicleta: 15,
      motocicleta: 40,
      vehiculo: 60,
    };

    const speedKmh = speeds[mode as string] || speeds['caminando'];
    
    // Distancia posible en X minutos
    const hours = mins / 60;
    const distanceKm = speedKmh * hours;

    // Crear un punto inicial
    const center = turf.point([longitude, latitude]);
    
    // Crear un polígono buffer (isócrona circular aproximada)
    // En OSRM avanzado existe una API de isochrones, pero Turf buffer da una excelente estimación geométrica rápida.
    const reachabilityPolygon = turf.buffer(center, distanceKm, { units: 'kilometers', steps: 32 });

    res.json({
      success: true,
      data: reachabilityPolygon
    });

  } catch (error: any) {
    console.error('ERROR calculando reachability:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al calcular alcance',
      error: error.message
    });
  }
});

// GET /api/analysis/kpis
// Estadísticas agregadas para el dashboard de supervisores
router.get('/kpis', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (_req: Request, res: Response) => {
  console.log('INFO: GET /api/analysis/kpis called');
  try {
    // Simulación de datos extraídos por consultas de agregación SQL sobre alert_events
    res.json({
      success: true,
      data: {
        topNeighborhoods: [
          { name: 'Centro Histórico', incidents: 12 },
          { name: 'Distrito Financiero', incidents: 8 },
          { name: 'Zona Industrial Sur', incidents: 5 }
        ],
        overdueAlerts: 2, // Alertas en pendiente > 5 min
        operatorLoads: [
          { operator: 'Op. Alpha', active: 4, resolvedLastHour: 15 },
          { operator: 'Op. Bravo', active: 1, resolvedLastHour: 8 },
          { operator: 'Op. Charlie', active: 0, resolvedLastHour: 2 }
        ]
      }
    });
  } catch (error: any) {
    console.error('ERROR obteniendo KPIs:', error.message);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

export { router as analysisRouter };
