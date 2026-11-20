import { Router, Request, Response } from 'express';
import * as turf from '@turf/turf';
import Alert from '../../../infrastructure/database/models/Alert';
import { getPgPool } from '../../../infrastructure/database/connection';
import { requireAuth, requireRole } from '../../../shared/middlewares/auth';
import { COMMAND_CENTER_ROLES } from '../../../shared/constants/system';
import { parsePostgisPoint } from '../../../shared/utils/postgis';

const router = Router();

const REACHABILITY_SPEEDS_KMH: Record<string, number> = {
  caminando: 5,
  bicicleta: 15,
  motocicleta: 40,
  vehiculo: 60,
};

// GET /api/analysis/hotspots
// Devuelve una agregación de incidentes activos para Heatmaps
router.get('/hotspots', requireAuth, requireRole(COMMAND_CENTER_ROLES), async (_req: Request, res: Response) => {
  try {
    const incidents = await Alert.findActive(100);

    // Devolvemos el array de coordenadas [lat, lng, weight] reutilizando la hidratación PostGIS centralizada
    const heatmapData = incidents
      .map((inc) => {
        const fallback = parsePostgisPoint(inc.location);
        const lat = inc.latitude ?? fallback?.latitude ?? null;
        const lng = inc.longitude ?? fallback?.longitude ?? null;
        if (lat === null || lng === null) return null;
        return [lat, lng, 1] as [number, number, number];
      })
      .filter((point): point is [number, number, number] => point !== null);

    res.json({
      success: true,
      count: heatmapData.length,
      data: heatmapData,
    });
  } catch (error: any) {
    console.error('ERROR obteniendo hotspots:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener zonas calientes',
      error: error.message,
    });
  }
});

// GET /api/analysis/reachability
// Estima la zona de alcance de un sospechoso (Isochrone simple usando Buffer de Turf)
router.get('/reachability', requireAuth, requireRole(COMMAND_CENTER_ROLES), async (req: Request, res: Response) => {
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

    const speedKmh = REACHABILITY_SPEEDS_KMH[mode as string] || REACHABILITY_SPEEDS_KMH.caminando;
    const distanceKm = speedKmh * (mins / 60);
    const center = turf.point([longitude, latitude]);
    const reachabilityPolygon = turf.buffer(center, distanceKm, { units: 'kilometers', steps: 32 });

    res.json({
      success: true,
      data: reachabilityPolygon,
    });
  } catch (error: any) {
    console.error('ERROR calculando reachability:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al calcular alcance',
      error: error.message,
    });
  }
});

// GET /api/analysis/kpis
// Estadísticas agregadas reales desde PostgreSQL para supervisores
router.get('/kpis', requireAuth, requireRole(COMMAND_CENTER_ROLES), async (_req: Request, res: Response) => {
  try {
    const pool = getPgPool();
    const [zonesRes, overdueRes, loadsRes] = await Promise.all([
      pool
        .query(
          `SELECT COALESCE(NULLIF(TRIM(address), ''), 'Sin dirección') AS name,
                  COUNT(*)::int AS incidents
           FROM public.alerts
           GROUP BY 1
           ORDER BY incidents DESC
           LIMIT 3`
        )
        .catch(() => ({ rows: [] })),
      pool
        .query(
          `SELECT COUNT(*)::int AS overdue
           FROM public.alerts
           WHERE status = 'pending' AND created_at < NOW() - INTERVAL '5 minutes'`
        )
        .catch(() => ({ rows: [{ overdue: 0 }] })),
      pool
        .query(
          `SELECT u.full_name AS operator,
                  COUNT(*) FILTER (WHERE ae.new_status = 'reviewing')::int AS active,
                  COUNT(*) FILTER (
                    WHERE ae.new_status = 'resolved'
                      AND ae.created_at >= NOW() - INTERVAL '1 hour'
                  )::int AS resolved_last_hour
           FROM public.alert_events ae
           JOIN public.users u ON u.id = ae.actor_id
           WHERE u.role IN ('operator', 'supervisor', 'admin')
           GROUP BY u.id, u.full_name
           ORDER BY resolved_last_hour DESC, active DESC
           LIMIT 5`
        )
        .catch(() => ({ rows: [] })),
    ]);

    res.json({
      success: true,
      data: {
        topNeighborhoods: zonesRes.rows.map((r: any) => ({
          name: r.name,
          incidents: Number(r.incidents) || 0,
        })),
        overdueAlerts: Number(overdueRes.rows[0]?.overdue) || 0,
        operatorLoads: loadsRes.rows.map((r: any) => ({
          operator: r.operator,
          active: Number(r.active) || 0,
          resolvedLastHour: Number(r.resolved_last_hour) || 0,
        })),
      },
    });
  } catch (error: any) {
    console.error('ERROR obteniendo KPIs:', error.message);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

export { router as analysisRouter };
