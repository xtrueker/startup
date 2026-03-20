import { Router, Request, Response } from 'express';
import * as turf from '@turf/turf';
import HistoricalIncident from '../../../infrastructure/database/models/HistoricalIncident';

const router = Router();

// GET /api/analysis/hotspots
// Devuelve una agregación de incidentes históricos para Heatmaps
router.get('/hotspots', async (req: Request, res: Response) => {
  console.log('INFO: GET /api/analysis/hotspots called');
  try {
    // Retornamos todos los históricos (en producción se filtraría por fecha/tipo)
    const incidents = await HistoricalIncident.find().sort({ reportedAt: -1 }).limit(1000);
    
    // Devolvemos el array de coordenadas [lat, lng, weight] para el Heatmap de Leaflet
    const heatmapData = incidents.map(inc => [
      inc.location.coordinates[1], // lat
      inc.location.coordinates[0], // lng
      1 // peso base
    ]);

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
router.get('/reachability', async (req: Request, res: Response) => {
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

export { router as analysisRouter };
