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
const auth_1 = require("../../../shared/middlewares/auth");
const router = (0, express_1.Router)();
exports.analysisRouter = router;
// GET /api/analysis/hotspots
// Devuelve una agregación de incidentes históricos para Heatmaps
router.get('/hotspots', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor', 'operator']), async (_req, res) => {
    console.log('INFO: GET /api/analysis/hotspots called');
    try {
        // Retornamos todas las activas por ahora para el heatmap (hasta tener la API de históricos lista)
        const incidents = await Alert_1.default.findActive(100);
        // Devolvemos el array de coordenadas [lat, lng, weight] para el Heatmap de Leaflet
        const heatmapData = incidents.map((inc) => {
            let lat = 0, lng = 0;
            if (inc.location && typeof inc.location === 'object' && inc.location.coordinates) {
                lng = inc.location.coordinates[0];
                lat = inc.location.coordinates[1];
            }
            else if (typeof inc.location === 'string') {
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
    }
    catch (error) {
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
router.get('/reachability', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor', 'operator']), async (req, res) => {
    console.log('INFO: GET /api/analysis/reachability called');
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
        // Velocidades estimadas en km/h
        const speeds = {
            caminando: 5,
            bicicleta: 15,
            motocicleta: 40,
            vehiculo: 60,
        };
        const speedKmh = speeds[mode] || speeds['caminando'];
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
    }
    catch (error) {
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
router.get('/kpis', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor', 'operator']), async (_req, res) => {
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
    }
    catch (error) {
        console.error('ERROR obteniendo KPIs:', error.message);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});
//# sourceMappingURL=routes.js.map