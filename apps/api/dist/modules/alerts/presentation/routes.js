"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertRouter = void 0;
const express_1 = require("express");
const Alert_1 = __importDefault(require("../../../infrastructure/database/models/Alert"));
const auth_1 = require("../../../shared/middlewares/auth");
const escapeRouting_1 = require("../services/escapeRouting");
const socket_1 = require("../../../shared/utils/socket");
const AuditService_1 = require("../../../shared/services/AuditService");
const router = (0, express_1.Router)();
exports.alertRouter = router;
// CREAR ALERTA DE EMERGENCIA
// POST /api/alerts
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor', 'operator']), async (req, res) => {
    console.log('INFO: POST /api/alerts called');
    try {
        const { userId, type, latitude, longitude, address, description, direction } = req.body;
        if (!userId || !latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
        }
        let escapeRoutes = [];
        if (type === 'robo' && direction) {
            escapeRoutes = await (0, escapeRouting_1.calculateEscapeRoutes)(latitude, longitude, direction);
        }
        const alert = await Alert_1.default.create({
            userId,
            type: type || 'emergency',
            latitude,
            longitude,
            address,
            description,
            direction,
            escapeRoutes
        });
        const alertData = {
            id: alert.id,
            type: alert.type,
            status: alert.status,
            location: { latitude, longitude, address },
            description: alert.description,
            direction: alert.direction,
            escapeRoutes: alert.escape_routes,
            createdAt: alert.created_at,
        };
        try {
            (0, socket_1.getSocket)().emit('alert:new', alertData);
            (0, socket_1.emitToOperators)('alert:new', alertData);
        }
        catch (wsError) {
            console.error('Error emitiendo WebSocket:', wsError);
        }
        res.status(201).json({ success: true, message: 'Alerta creada exitosamente', data: { alert: alertData } });
    }
    catch (error) {
        console.error('ERROR creando alerta:', error.message);
        res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
});
// OBTENER TODAS LAS ALERTAS ACTIVAS
// GET /api/alerts
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor', 'operator']), async (_req, res) => {
    console.log('INFO: GET /api/alerts called');
    try {
        const alerts = await Alert_1.default.findActive(50);
        res.json({
            success: true,
            count: alerts.length,
            data: alerts.map((alert) => {
                let lat = 0, lng = 0;
                if (alert.location && typeof alert.location === 'object' && alert.location.coordinates) {
                    lng = alert.location.coordinates[0];
                    lat = alert.location.coordinates[1];
                }
                else if (typeof alert.location === 'string') {
                    const match = alert.location.match(/POINT\(([^ ]+) ([^)]+)\)/);
                    if (match) {
                        lng = parseFloat(match[1]);
                        lat = parseFloat(match[2]);
                    }
                }
                return {
                    id: alert.id,
                    type: alert.type,
                    status: alert.status,
                    location: {
                        latitude: lat,
                        longitude: lng,
                        address: alert.address,
                    },
                    description: alert.description,
                    direction: alert.direction,
                    escapeRoutes: alert.escape_routes,
                    createdAt: alert.created_at,
                };
            }),
        });
    }
    catch (error) {
        console.error('ERROR obteniendo alertas:', error.message);
        res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
});
// ELIMINAR/RESOLVER ALERTA
// DELETE /api/alerts/:id
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor', 'operator']), async (req, res) => {
    console.log(`INFO: DELETE /api/alerts/${req.params.id} called`);
    try {
        const { id } = req.params;
        const adminId = req.user?.id || 'system';
        await Alert_1.default.archive(id, adminId);
        try {
            (0, socket_1.getSocket)().emit('alert:deleted', { id });
            (0, socket_1.emitToOperators)('alert:deleted', { id });
        }
        catch (wsError) {
            console.error('Error emitiendo WebSocket:', wsError);
        }
        res.json({ success: true, message: 'Alerta resuelta y archivada históricamente' });
    }
    catch (error) {
        console.error('ERROR eliminando alerta:', error.message);
        res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
});
// ACTUALIZAR ESTADO DE ALERTA (MÁQUINA DE ESTADOS)
// PATCH /api/alerts/:id/status
router.patch('/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor', 'operator']), async (req, res) => {
    console.log(`INFO: PATCH /api/alerts/${req.params.id}/status called`);
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const actorId = req.user?.id || req.user?.userId || 'system';
        const validStatuses = ['pending', 'reviewing', 'verified', 'resolved', 'discarded'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Estado inválido' });
        }
        const alertBefore = await Alert_1.default.findById(id);
        const oldStatus = alertBefore ? alertBefore.status : 'unknown';
        // Call DAO which handles the update and also logs the event in alert_events
        await Alert_1.default.updateStatus(id, status, actorId, notes);
        // General Audit tracking
        try {
            await AuditService_1.AuditService.logAlertTransition(actorId, id, oldStatus, status, req.ip);
        }
        catch (auditErr) {
            console.warn('⚠️ Warning: AuditService.logAlertTransition failed, but skipping crash:', auditErr.message);
        }
        // Broadcast update
        try {
            (0, socket_1.getSocket)().emit('alert:updated', { id, status });
            (0, socket_1.emitToOperators)('alert:updated', { id, status });
        }
        catch (wsError) {
            console.error('Error emitiendo WebSocket:', wsError);
        }
        res.json({ success: true, message: `Estado de alerta actualizado a ${status}` });
    }
    catch (error) {
        console.error('ERROR actualizando estado de alerta:', error.message);
        res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
});
// HISTORIAL DE EVENTOS DE ALERTA
// GET /api/alerts/:id/events
router.get('/:id/events', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor', 'operator']), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = require('../../../infrastructure/database/connection').getPgPool();
        const result = await pool.query(`
      SELECT id, event_type, previous_status, new_status, notes, created_at 
      FROM alert_events 
      WHERE alert_id = $1 
      ORDER BY created_at ASC
    `, [id]);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('ERROR obteniendo eventos de alerta:', error.message);
        res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
});
//# sourceMappingURL=routes.js.map