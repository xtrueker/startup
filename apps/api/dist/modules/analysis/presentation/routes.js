"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisRouter = void 0;
const express_1 = require("express");
const turf = __importStar(require("@turf/turf"));
const Alert_1 = __importDefault(require("../../../infrastructure/database/models/Alert"));
const connection_1 = require("../../../infrastructure/database/connection");
const auth_1 = require("../../../shared/middlewares/auth");
const system_1 = require("../../../shared/constants/system");
const postgis_1 = require("../../../shared/utils/postgis");
const router = (0, express_1.Router)();
exports.analysisRouter = router;
const REACHABILITY_SPEEDS_KMH = {
    caminando: 5,
    bicicleta: 15,
    motocicleta: 40,
    vehiculo: 60,
};
// GET /api/analysis/hotspots
// Devuelve una agregación de incidentes activos para Heatmaps
router.get('/hotspots', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.COMMAND_CENTER_ROLES), async (_req, res) => {
    try {
        const incidents = await Alert_1.default.findActive(100);
        // Devolvemos el array de coordenadas [lat, lng, weight] reutilizando la hidratación PostGIS centralizada
        const heatmapData = incidents
            .map((inc) => {
            const fallback = (0, postgis_1.parsePostgisPoint)(inc.location);
            const lat = inc.latitude ?? fallback?.latitude ?? null;
            const lng = inc.longitude ?? fallback?.longitude ?? null;
            if (lat === null || lng === null)
                return null;
            return [lat, lng, 1];
        })
            .filter((point) => point !== null);
        res.json({
            success: true,
            count: heatmapData.length,
            data: heatmapData,
        });
    }
    catch (error) {
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
router.get('/reachability', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.COMMAND_CENTER_ROLES), async (req, res) => {
    try {
        const { lat, lng, mode, minutes } = req.query;
        if (!lat || !lng || !mode || !minutes) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros: lat, lng, mode, minutes',
            });
        }
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const mins = parseFloat(minutes);
        const speedKmh = REACHABILITY_SPEEDS_KMH[mode] || REACHABILITY_SPEEDS_KMH.caminando;
        const distanceKm = speedKmh * (mins / 60);
        const center = turf.point([longitude, latitude]);
        const reachabilityPolygon = turf.buffer(center, distanceKm, { units: 'kilometers', steps: 32 });
        res.json({
            success: true,
            data: reachabilityPolygon,
        });
    }
    catch (error) {
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
router.get('/kpis', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.COMMAND_CENTER_ROLES), async (_req, res) => {
    try {
        const pool = (0, connection_1.getPgPool)();
        const [zonesRes, overdueRes, loadsRes] = await Promise.all([
            pool
                .query(`SELECT COALESCE(NULLIF(TRIM(address), ''), 'Sin dirección') AS name,
                  COUNT(*)::int AS incidents
           FROM public.alerts
           GROUP BY 1
           ORDER BY incidents DESC
           LIMIT 3`)
                .catch(() => ({ rows: [] })),
            pool
                .query(`SELECT COUNT(*)::int AS overdue
           FROM public.alerts
           WHERE status = 'pending' AND created_at < NOW() - INTERVAL '5 minutes'`)
                .catch(() => ({ rows: [{ overdue: 0 }] })),
            pool
                .query(`SELECT u.full_name AS operator,
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
           LIMIT 5`)
                .catch(() => ({ rows: [] })),
        ]);
        res.json({
            success: true,
            data: {
                topNeighborhoods: zonesRes.rows.map((r) => ({
                    name: r.name,
                    incidents: Number(r.incidents) || 0,
                })),
                overdueAlerts: Number(overdueRes.rows[0]?.overdue) || 0,
                operatorLoads: loadsRes.rows.map((r) => ({
                    operator: r.operator,
                    active: Number(r.active) || 0,
                    resolvedLastHour: Number(r.resolved_last_hour) || 0,
                })),
            },
        });
    }
    catch (error) {
        console.error('ERROR obteniendo KPIs:', error.message);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});
//# sourceMappingURL=routes.js.map