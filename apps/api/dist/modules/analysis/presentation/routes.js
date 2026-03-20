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
const HistoricalIncident_1 = __importDefault(require("../../../infrastructure/database/models/HistoricalIncident"));
const router = (0, express_1.Router)();
exports.analysisRouter = router;
// GET /api/analysis/hotspots
// Devuelve una agregación de incidentes históricos para Heatmaps
router.get('/hotspots', async (req, res) => {
    console.log('INFO: GET /api/analysis/hotspots called');
    try {
        // Retornamos todos los históricos (en producción se filtraría por fecha/tipo)
        const incidents = await HistoricalIncident_1.default.find().sort({ reportedAt: -1 }).limit(1000);
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
router.get('/reachability', async (req, res) => {
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
//# sourceMappingURL=routes.js.map