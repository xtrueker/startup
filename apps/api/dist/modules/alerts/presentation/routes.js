"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertRouter = void 0;
const express_1 = require("express");
const Alert_1 = __importDefault(require("../../../infrastructure/database/models/Alert"));
const HistoricalIncident_1 = __importDefault(require("../../../infrastructure/database/models/HistoricalIncident"));
const auth_1 = require("../../../shared/middlewares/auth");
const escapeRouting_1 = require("../services/escapeRouting");
const socket_1 = require("../../../shared/utils/socket");
const router = (0, express_1.Router)();
exports.alertRouter = router;
// CREAR ALERTA DE EMERGENCIA
// POST /api/alerts
router.post('/', async (req, res) => {
    console.log('INFO: POST /api/alerts called');
    try {
        const { userId, type, latitude, longitude, address, description, direction } = req.body;
        // Validar datos requeridos
        if (!userId || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos obligatorios: userId, latitude, longitude',
            });
        }
        // Calcular rutas de escape si es un robo y hay dirección
        let escapeRoutes = [];
        if (type === 'robo' && direction) {
            escapeRoutes = await (0, escapeRouting_1.calculateEscapeRoutes)(latitude, longitude, direction);
        }
        // Crear alerta
        const alert = await Alert_1.default.create({
            userId,
            type: type || 'emergency',
            status: 'active',
            location: {
                type: 'Point',
                coordinates: [longitude, latitude], // [longitud, latitud]
                address: address || '',
            },
            description: description || '',
            direction,
            escapeRoutes: escapeRoutes.length > 0 ? escapeRoutes : undefined,
        });
        const alertData = {
            id: alert._id,
            type: alert.type,
            status: alert.status,
            location: {
                latitude: alert.location.coordinates[1],
                longitude: alert.location.coordinates[0],
                address: alert.location.address,
            },
            description: alert.description,
            direction: alert.direction,
            escapeRoutes: alert.escapeRoutes,
            createdAt: alert.createdAt,
        };
        // Emitir evento WebSocket a todos los operadores conectados
        try {
            (0, socket_1.getSocket)().emit('alert:new', alertData); // legacy namespace
            (0, socket_1.emitToOperators)('alert:new', alertData); // /operators namespace
        }
        catch (wsError) {
            console.error('Error emitiendo WebSocket (alert:new):', wsError);
        }
        // Responder éxito
        res.status(201).json({
            success: true,
            message: 'Alerta creada exitosamente',
            data: { alert: alertData },
        });
    }
    catch (error) {
        console.error('ERROR creando alerta:', error.message, error.stack);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al crear alerta',
            error: error.message,
        });
    }
});
// OBTENER TODAS LAS ALERTAS ACTIVAS
// GET /api/alerts
router.get('/', async (req, res) => {
    console.log('INFO: GET /api/alerts called');
    try {
        const alerts = await Alert_1.default.find({ status: 'active' })
            .sort({ createdAt: -1 }) // Más recientes primero
            .limit(50);
        res.json({
            success: true,
            count: alerts.length,
            data: alerts.map(alert => ({
                id: alert._id,
                type: alert.type,
                status: alert.status,
                location: {
                    latitude: alert.location.coordinates[1],
                    longitude: alert.location.coordinates[0],
                    address: alert.location.address,
                },
                description: alert.description,
                direction: alert.direction,
                escapeRoutes: alert.escapeRoutes,
                createdAt: alert.createdAt,
            })),
        });
    }
    catch (error) {
        console.error('ERROR obteniendo alertas:', error.message, error.stack);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener alertas',
            error: error.message
        });
    }
});
// ELIMINAR/RESOLVER ALERTA
// DELETE /api/alerts/:id
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor', 'operator']), async (req, res) => {
    console.log(`INFO: DELETE /api/alerts/${req.params.id} called`);
    try {
        const { id } = req.params;
        // Buscar la alerta original
        const alert = await Alert_1.default.findById(id);
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alerta no encontrada',
            });
        }
        // Mover a incidente histórico
        await HistoricalIncident_1.default.create({
            originalAlertId: alert._id,
            type: alert.type,
            location: alert.location,
            reportedAt: alert.createdAt,
            resolvedAt: new Date(),
        });
        // Eliminar alerta activa
        await Alert_1.default.findByIdAndDelete(id);
        // Emitir evento WebSocket a todos los operadores conectados
        try {
            (0, socket_1.getSocket)().emit('alert:deleted', { id }); // legacy
            (0, socket_1.emitToOperators)('alert:deleted', { id }); // /operators namespace
        }
        catch (wsError) {
            console.error('Error emitiendo WebSocket (alert:deleted):', wsError);
        }
        res.json({
            success: true,
            message: 'Alerta resuelta y archivada históricamente',
        });
    }
    catch (error) {
        console.error('ERROR eliminando alerta:', error.message, error.stack);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al eliminar la alerta',
            error: error.message,
        });
    }
});
//# sourceMappingURL=routes.js.map