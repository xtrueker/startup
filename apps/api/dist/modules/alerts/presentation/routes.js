"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertRouter = void 0;
const express_1 = require("express");
const Alert_1 = __importDefault(require("../../../infrastructure/database/models/Alert"));
const auth_1 = require("../../../shared/middlewares/auth");
const system_1 = require("../../../shared/constants/system");
const escapeRouting_1 = require("../services/escapeRouting");
const socket_1 = require("../../../shared/utils/socket");
const url_1 = require("../../../shared/utils/url");
const AuditService_1 = require("../../../shared/services/AuditService");
const connection_1 = require("../../../infrastructure/database/connection");
const models_1 = require("../../../infrastructure/database/models");
const EvidenceStorageService_1 = require("../../mobile/services/EvidenceStorageService");
const router = (0, express_1.Router)();
exports.alertRouter = router;
function formatAlertDTO(alert) {
    return {
        id: alert.id,
        type: alert.type,
        status: alert.status,
        location: {
            latitude: alert.latitude ?? 0,
            longitude: alert.longitude ?? 0,
            address: alert.address,
        },
        description: alert.description,
        direction: alert.direction,
        escapeRoutes: alert.escape_routes,
        createdAt: alert.created_at,
    };
}
// CREAR ALERTA DE EMERGENCIA
// POST /api/alerts
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.COMMAND_CENTER_ROLES), async (req, res) => {
    try {
        const { userId, type, latitude, longitude, address, description, direction } = req.body;
        if (!userId || latitude === undefined || longitude === undefined) {
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
            escapeRoutes,
        });
        const alertData = {
            ...formatAlertDTO(alert),
            location: { latitude, longitude, address },
        };
        (0, socket_1.emitToOperatorsAndRoot)('alert:new', alertData);
        res.status(201).json({ success: true, message: 'Alerta creada exitosamente', data: { alert: alertData } });
    }
    catch (error) {
        console.error('ERROR creando alerta:', error.message);
        res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
});
// OBTENER TODAS LAS ALERTAS ACTIVAS
// GET /api/alerts
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.COMMAND_CENTER_ROLES), async (_req, res) => {
    try {
        const alerts = await Alert_1.default.findActive(50);
        res.json({
            success: true,
            count: alerts.length,
            data: alerts.map(formatAlertDTO),
        });
    }
    catch (error) {
        console.error('ERROR obteniendo alertas:', error.message);
        res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
});
// ELIMINAR/RESOLVER ALERTA
// DELETE /api/alerts/:id
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.COMMAND_CENTER_ROLES), async (req, res) => {
    try {
        const { id } = req.params;
        const actorId = (0, auth_1.getRequestUserId)(req) || 'system';
        await Alert_1.default.archive(id, actorId);
        (0, socket_1.emitToOperatorsAndRoot)('alert:deleted', { id });
        res.json({ success: true, message: 'Alerta resuelta y archivada históricamente' });
    }
    catch (error) {
        console.error('ERROR eliminando alerta:', error.message);
        res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
});
// ACTUALIZAR ESTADO DE ALERTA (MÁQUINA DE ESTADOS)
// PATCH /api/alerts/:id/status
router.patch('/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.COMMAND_CENTER_ROLES), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const actorId = (0, auth_1.getRequestUserId)(req) || 'system';
        if (!system_1.ALERT_VALID_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: 'Estado inválido' });
        }
        const alertBefore = await Alert_1.default.findById(id);
        const oldStatus = alertBefore ? alertBefore.status : 'unknown';
        await Alert_1.default.updateStatus(id, status, actorId, notes);
        try {
            await AuditService_1.AuditService.logAlertTransition(actorId, id, oldStatus, status, req.ip);
        }
        catch (auditErr) {
            console.warn('⚠️ Warning: AuditService.logAlertTransition failed, but skipping crash:', auditErr.message);
        }
        (0, socket_1.emitToOperatorsAndRoot)('alert:updated', { id, status });
        res.json({ success: true, message: `Estado de alerta actualizado a ${status}` });
    }
    catch (error) {
        console.error('ERROR actualizando estado de alerta:', error.message);
        res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
});
// DESPACHO TÁCTICO DE ALERTA A PATRULLAS POLICIALES
// POST /api/alerts/:id/dispatch
router.post('/:id/dispatch', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.COMMAND_CENTER_ROLES), async (req, res) => {
    try {
        const { id } = req.params;
        const { officerId, notes } = req.body;
        const alert = await Alert_1.default.findById(id);
        if (!alert) {
            return res.status(404).json({ success: false, message: 'Alerta no encontrada' });
        }
        let citizenName = 'Ciudadano en Emergencia';
        const targetUserId = alert.userId || alert.user_id;
        if (targetUserId) {
            try {
                const citizen = await models_1.User.findById(targetUserId);
                if (citizen?.full_name) {
                    citizenName = citizen.full_name;
                }
            }
            catch (userErr) {
                console.warn('No se pudo obtener nombre del ciudadano:', userErr);
            }
        }
        const rawLat = alert.latitude ?? req.body?.latitude;
        const rawLng = alert.longitude ?? req.body?.longitude;
        const latitude = rawLat !== null && rawLat !== undefined && rawLat !== '' ? Number(rawLat) : NaN;
        const longitude = rawLng !== null && rawLng !== undefined && rawLng !== '' ? Number(rawLng) : NaN;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return res.status(422).json({
                success: false,
                message: 'La alerta no contiene coordenadas GPS válidas para el despacho táctico',
            });
        }
        (0, socket_1.dispatchTacticalAlert)({
            alertId: alert.id,
            citizenName,
            emergencyType: alert.type || 'emergency',
            latitude,
            longitude,
            address: alert.address || '',
            officerId,
            notes: notes || '🚨 Despacho prioritario del Centro de Mando Web'
        });
        res.json({
            success: true,
            message: '🚨 Despacho táctico transmitido a patrullas policiales exitosamente',
            data: {
                alertId: alert.id,
                citizenName,
                latitude,
                longitude,
                dispatchedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('ERROR en despacho táctico:', error.message);
        res.status(500).json({ success: false, message: 'Error interno al despachar alerta', error: error.message });
    }
});
// HISTORIAL DE EVENTOS DE ALERTA
// GET /api/alerts/:id/events
router.get('/:id/events', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.COMMAND_CENTER_ROLES), async (req, res) => {
    try {
        const { id } = req.params;
        if (!system_1.UUID_REGEX.test(id)) {
            return res.status(400).json({ success: false, message: 'ID de alerta inválido' });
        }
        const pool = (0, connection_1.getPgPool)();
        const eventsRes = await pool.query(`SELECT id, event_type, previous_status, new_status, notes, created_at
       FROM public.alert_events
       WHERE alert_id = $1
       ORDER BY created_at ASC`, [id]);
        res.json({ success: true, data: eventsRes.rows });
    }
    catch (error) {
        console.error('ERROR obteniendo eventos de alerta:', error.message);
        res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
});
// EVIDENCIAS ACÚSTICAS DE UNA ALERTA (CON URLS FIRMADAS DE REPRODUCCIÓN)
// GET /api/alerts/:id/evidence
router.get('/:id/evidence', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.AUTHORITY_ROLES), async (req, res) => {
    try {
        const { id } = req.params;
        const clips = await EvidenceStorageService_1.EvidenceStorageService.listAlertEvidence(id, (0, url_1.resolveRequestBaseUrl)(req));
        res.json({
            success: true,
            count: clips.length,
            data: clips,
        });
    }
    catch (error) {
        console.error('ERROR obteniendo evidencias de alerta:', error.message);
        res.status(500).json({ success: false, message: 'Error obteniendo evidencias de audio' });
    }
});
//# sourceMappingURL=routes.js.map