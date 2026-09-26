"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mobileRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../../shared/middlewares/auth");
const Alert_1 = __importDefault(require("../../../infrastructure/database/models/Alert"));
const connection_1 = require("../../../infrastructure/database/connection");
const socket_1 = require("../../../shared/utils/socket");
const router = (0, express_1.Router)();
exports.mobileRouter = router;
// POST /api/mobile/panic
router.post('/panic', auth_1.requireAuth, async (req, res) => {
    try {
        const { latitude, longitude, address, description } = req.body;
        const userId = req.user?.userId || req.user?.id;
        if (!latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'latitude y longitude son obligatorios' });
        }
        const alert = await Alert_1.default.create({
            userId,
            type: 'emergency',
            latitude,
            longitude,
            address,
            description: description || 'Pánico activado desde aplicación móvil'
        });
        const alertData = {
            id: alert.id,
            userId,
            type: alert.type,
            status: alert.status,
            source: 'mobile',
            location: { latitude, longitude, address },
            description: alert.description,
            createdAt: alert.created_at,
        };
        (0, socket_1.emitToOperators)('alert:new', alertData);
        res.status(201).json({
            success: true,
            message: 'Pánico registrado. Ayuda en camino.',
            data: { alertId: alert.id, status: alert.status },
        });
    }
    catch (error) {
        console.error('Error activando pánico:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
// POST /api/mobile/location
router.post('/location', auth_1.requireAuth, async (req, res) => {
    try {
        const { alertId, latitude, longitude, accuracy, speed, heading } = req.body;
        const userId = req.user?.userId || req.user?.id;
        if (!alertId || !latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'alertId, latitude y longitude son obligatorios' });
        }
        const locationData = {
            userId, alertId, latitude, longitude, accuracy: accuracy || null, speed: speed || null, heading: heading || null, timestamp: new Date().toISOString(),
        };
        (0, socket_1.emitToAlertRoom)(alertId, 'user:location_update', locationData);
        // Log location update in event sourcing
        const pool = (0, connection_1.getPgPool)();
        await pool.query(`
      INSERT INTO alert_events (alert_id, actor_id, event_type, location, notes)
      VALUES ($1, $2, 'location_update', ST_GeomFromText($3, 4326), 'Mobile live location update')
    `, [alertId, userId, `POINT(${longitude} ${latitude})`]);
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Error actualizando ubicación:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
// GET /api/mobile/alerts/me
router.get('/alerts/me', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        const pool = (0, connection_1.getPgPool)();
        const { rows: alerts } = await pool.query(`
      SELECT id, type, status, address, description, created_at, ST_AsText(location) as location
      FROM alerts
      WHERE user_id = $1 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);
        res.json({
            success: true,
            data: alerts.map((a) => {
                let lat = 0, lng = 0;
                if (typeof a.location === 'string') {
                    const match = a.location.match(/POINT\(([^ ]+) ([^)]+)\)/);
                    if (match) {
                        lng = parseFloat(match[1]);
                        lat = parseFloat(match[2]);
                    }
                }
                return {
                    id: a.id, type: a.type, status: a.status,
                    location: { address: a.address, latitude: lat, longitude: lng },
                    description: a.description, createdAt: a.created_at,
                };
            }),
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
// PATCH /api/mobile/alerts/:id/cancel
router.patch('/alerts/:id/cancel', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId || req.user?.id;
        const sb = (0, connection_1.supabase)();
        const { data: existing } = await sb.from('alerts').select('*').eq('id', id).single();
        if (!existing || existing.user_id !== userId) {
            return res.status(404).json({ success: false, message: 'Alerta no encontrada o no autorizada' });
        }
        await Alert_1.default.updateStatus(id, 'discarded', userId, 'Cancelled by mobile user');
        (0, socket_1.emitToOperators)('alert:cancelled', { id, userId, reason: 'false_alarm' });
        res.json({ success: true, message: 'Alerta cancelada' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
//# sourceMappingURL=routes.js.map