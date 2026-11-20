"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mobileRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../../shared/middlewares/auth");
const system_1 = require("../../../shared/constants/system");
const Alert_1 = __importDefault(require("../../../infrastructure/database/models/Alert"));
const User_1 = __importDefault(require("../../../infrastructure/database/models/User"));
const connection_1 = require("../../../infrastructure/database/connection");
const socket_1 = require("../../../shared/utils/socket");
const url_1 = require("../../../shared/utils/url");
const EvidenceStorageService_1 = require("../services/EvidenceStorageService");
const cryptoVault_1 = require("../../../shared/utils/cryptoVault");
const postgis_1 = require("../../../shared/utils/postgis");
const PushDispatchService_1 = require("../../../shared/services/PushDispatchService");
const WhatsAppDispatchService_1 = require("../../../shared/services/WhatsAppDispatchService");
const router = (0, express_1.Router)();
exports.mobileRouter = router;
/**
 * Verifica que la alerta exista y que el emisor sea el propietario legítimo de la emergencia,
 * impidiendo inyección externa de coordenadas GPS o audios falsos mediante UUID filtrado.
 */
async function verifyMobileAlertOwnership(alertId, callerUserId) {
    if (!system_1.UUID_REGEX.test(alertId)) {
        return { ok: false, status: 400, message: 'Identificador de alerta no válido' };
    }
    const existingAlert = await Alert_1.default.findById(alertId);
    if (!existingAlert) {
        return { ok: false, status: 404, message: 'Alerta no encontrada' };
    }
    const alertOwnerId = existingAlert.userId || existingAlert.user_id || system_1.ANONYMOUS_CITIZEN_UUID;
    if (alertOwnerId !== callerUserId) {
        return {
            ok: false,
            status: 403,
            message: 'No estás autorizado para transmitir telemetría o evidencia sobre esta alerta',
        };
    }
    return { ok: true };
}
/**
 * @swagger
 * /api/mobile/panic:
 *   post:
 *     summary: Activar alerta SOS ciudadana (con despacho automático Push + WhatsApp)
 *     tags: [Mobile]
 */
router.post('/panic', async (req, res) => {
    try {
        const { latitude, longitude, address, description, triggerType } = req.body;
        const tokenUser = (0, auth_1.extractOptionalUser)(req);
        const userId = tokenUser.userId || system_1.ANONYMOUS_CITIZEN_UUID;
        if (latitude === undefined || longitude === undefined) {
            return res
                .status(400)
                .json({ success: false, message: 'latitude y longitude son obligatorios' });
        }
        const alert = await Alert_1.default.create({
            userId,
            type: req.body.type || 'emergency',
            latitude,
            longitude,
            address,
            description: description || 'Pánico activado desde aplicación móvil',
        });
        // Consultar identidad verificada del ciudadano para enriquecer despacho sin bloquear respuesta
        let citizenProfile = null;
        if (userId !== system_1.ANONYMOUS_CITIZEN_UUID) {
            try {
                citizenProfile = await User_1.default.findById(userId);
            }
            catch {
                citizenProfile = null;
            }
        }
        const alertData = {
            id: alert.id,
            userId,
            citizenName: citizenProfile?.full_name || 'Ciudadano en Emergencia',
            isVerified: Boolean(citizenProfile?.is_verified),
            type: alert.type,
            status: alert.status,
            source: 'mobile',
            triggerType: triggerType || 'button',
            location: { latitude, longitude, address },
            description: alert.description,
            createdAt: alert.created_at,
        };
        (0, socket_1.emitToOperators)('alert:new', alertData);
        // Despacho asíncrono en paralelo: Push a patrullas + WhatsApp operativo con link de rastreo
        const trackingUrl = (0, url_1.buildCitizenTrackingUrl)(alert.id);
        PushDispatchService_1.PushDispatchService.broadcastEmergencyToResponders({
            alertId: alert.id,
            title: triggerType === 'ghost_mode'
                ? 'SOS Silencioso Activo — Red Ciudadana'
                : 'Nueva Alerta SOS — Red Ciudadana',
            body: `${alertData.citizenName} · ${address || `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`}`,
            data: {
                alertId: alert.id,
                latitude,
                longitude,
                address,
                citizenName: alertData.citizenName,
                trackingUrl,
            },
        }).catch(() => { });
        WhatsAppDispatchService_1.WhatsAppDispatchService.sendEmergencyDispatch({
            alertId: alert.id,
            citizenName: citizenProfile?.full_name,
            citizenPhone: citizenProfile?.phone,
            isVerified: Boolean(citizenProfile?.is_verified),
            latitude: Number(latitude),
            longitude: Number(longitude),
            address,
            triggerType,
        }).catch(() => { });
        res.status(201).json({
            success: true,
            message: 'Pánico registrado. Ayuda en camino.',
            data: {
                alertId: alert.id,
                status: alert.status,
                trackingUrl,
            },
        });
    }
    catch (error) {
        console.error('Error activando pánico:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
/**
 * @swagger
 * /api/mobile/location:
 *   post:
 *     summary: Transmitir telemetría GPS en tiempo real durante una alerta activa
 *     tags: [Mobile]
 */
router.post('/location', async (req, res) => {
    try {
        const { alertId, latitude, longitude, accuracy, speed, heading } = req.body;
        const tokenUser = (0, auth_1.extractOptionalUser)(req);
        const userId = tokenUser.userId || system_1.ANONYMOUS_CITIZEN_UUID;
        if (!alertId || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: 'alertId, latitude y longitude son obligatorios',
            });
        }
        const ownership = await verifyMobileAlertOwnership(String(alertId), userId);
        if (!ownership.ok) {
            return res.status(ownership.status).json({
                success: false,
                message: ownership.message,
            });
        }
        const locationData = {
            userId,
            alertId,
            latitude,
            longitude,
            accuracy: accuracy || null,
            speed: speed || null,
            heading: heading || null,
            timestamp: new Date().toISOString(),
        };
        (0, socket_1.emitToAlertRoom)(alertId, 'user:location_update', locationData);
        (0, socket_1.emitToOperators)('user:location_update', locationData);
        try {
            await (0, connection_1.getPgPool)().query(`INSERT INTO public.alert_events (alert_id, actor_id, event_type, location, notes)
         VALUES ($1, $2, 'location_update', ST_SetSRID(ST_MakePoint($3, $4), 4326), 'Mobile live location update')`, [alertId, userId, Number(longitude), Number(latitude)]);
        }
        catch (lErr) {
            console.warn('Warning logging mobile location update:', lErr.message);
        }
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Error actualizando ubicación:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
/**
 * @swagger
 * /api/mobile/evidence/audio:
 *   post:
 *     summary: Subir fragmento de evidencia acústica encubierta (cifrada con AES-256-GCM + SHA-256)
 *     tags: [Mobile]
 */
router.post('/evidence/audio', async (req, res) => {
    try {
        const { alertId, audioBase64, mimeType, chunkIndex, durationMs } = req.body;
        if (!alertId || !audioBase64) {
            return res.status(400).json({
                success: false,
                message: 'alertId y audioBase64 son obligatorios',
            });
        }
        const tokenUser = (0, auth_1.extractOptionalUser)(req);
        const callerUserId = tokenUser.userId || system_1.ANONYMOUS_CITIZEN_UUID;
        const ownership = await verifyMobileAlertOwnership(String(alertId), callerUserId);
        if (!ownership.ok) {
            return res.status(ownership.status).json({
                success: false,
                message: ownership.message,
            });
        }
        const saved = await EvidenceStorageService_1.EvidenceStorageService.saveAudioChunk({
            alertId,
            userId: tokenUser.userId || null,
            audioBase64,
            mimeType,
            chunkIndex,
            durationMs,
            apiBaseUrl: (0, url_1.resolveRequestBaseUrl)(req),
        });
        // Notificar en vivo al Centro de Mando Web (compatible con useCommandStore.pushAudioChunk)
        (0, socket_1.emitToOperators)('evidence:audio_chunk', {
            id: saved.id,
            alertId: saved.alertId,
            url: saved.signedStreamUrl,
            sha256Hash: saved.sha256Hash,
            chunkIndex: saved.chunkIndex,
            createdAt: saved.createdAt,
        });
        res.status(201).json({
            success: true,
            message: 'Evidencia acústica cifrada y transmitida al Centro de Mando',
            data: {
                id: saved.id,
                alertId: saved.alertId,
                sha256Hash: saved.sha256Hash,
                byteSize: saved.byteSize,
                chunkIndex: saved.chunkIndex,
                url: saved.signedStreamUrl,
            },
        });
    }
    catch (error) {
        console.error('Error guardando evidencia de audio:', error.message);
        res.status(422).json({
            success: false,
            message: error.message || 'No se pudo procesar el fragmento de audio',
        });
    }
});
/**
 * @swagger
 * /api/mobile/evidence/stream/{id}:
 *   get:
 *     summary: Reproducir evidencia acústica mediante URL temporal firmada (HMAC-SHA256)
 *     tags: [Mobile]
 */
router.get('/evidence/stream/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const exp = req.query.exp;
        const sig = req.query.sig;
        const validSignature = (0, cryptoVault_1.verifyEvidenceStreamSignature)(id, exp, sig);
        if (!validSignature) {
            const tokenUser = (0, auth_1.extractOptionalUser)(req);
            if (!tokenUser.role || !system_1.AUTHORITY_ROLES.includes(tokenUser.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Firma de acceso expirada o no autorizada',
                });
            }
        }
        const audio = await EvidenceStorageService_1.EvidenceStorageService.getDecryptedAudioById(id);
        if (!audio) {
            return res.status(404).json({
                success: false,
                message: 'Evidencia no encontrada',
            });
        }
        const totalLength = audio.buffer.length;
        res.setHeader('Content-Type', audio.mimeType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.setHeader('X-Evidence-SHA256', audio.sha256Hash);
        const rangeHeader = req.headers.range;
        if (rangeHeader) {
            const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
            if (match) {
                const start = match[1] ? parseInt(match[1], 10) : 0;
                const end = match[2] ? Math.min(parseInt(match[2], 10), totalLength - 1) : totalLength - 1;
                if (start >= 0 && start <= end && start < totalLength) {
                    const chunk = audio.buffer.subarray(start, end + 1);
                    res.setHeader('Content-Range', `bytes ${start}-${end}/${totalLength}`);
                    res.setHeader('Content-Length', chunk.length.toString());
                    return res.status(206).send(chunk);
                }
            }
        }
        res.setHeader('Content-Length', totalLength.toString());
        res.status(200).send(audio.buffer);
    }
    catch (error) {
        console.error('Error reproduciendo evidencia:', error.message);
        res.status(500).json({ success: false, message: 'Error al descifrar evidencia' });
    }
});
/**
 * @swagger
 * /api/mobile/evidence/vault:
 *   get:
 *     summary: Obtener bóveda histórica de alertas con grabaciones de audio firmadas para reproducción
 *     tags: [Mobile]
 */
router.get('/evidence/vault', auth_1.requireAuth, async (req, res) => {
    try {
        const authUser = req.user;
        const userId = (0, auth_1.getRequestUserId)(req) || '';
        const role = authUser?.role || 'citizen';
        const bundles = await EvidenceStorageService_1.EvidenceStorageService.listEvidenceVault({
            userId,
            role,
            apiBaseUrl: (0, url_1.resolveRequestBaseUrl)(req),
        });
        res.json({ success: true, count: bundles.length, data: bundles });
    }
    catch (error) {
        console.error('Error consultando bóveda de evidencias:', error.message);
        res.status(500).json({ success: false, message: 'Error cargando grabaciones de evidencia' });
    }
});
/**
 * @swagger
 * /api/mobile/alerts/{id}/evidence:
 *   get:
 *     summary: Listar evidencias acústicas de una alerta con cadena de custodia SHA-256
 *     tags: [Mobile]
 */
router.get('/alerts/:id/evidence', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const items = await EvidenceStorageService_1.EvidenceStorageService.listAlertEvidence(id, (0, url_1.resolveRequestBaseUrl)(req));
        res.json({ success: true, data: items });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error listando evidencias' });
    }
});
/**
 * @swagger
 * /api/mobile/push-token:
 *   post:
 *     summary: Registrar token Push del dispositivo (FCM / APNs / Expo)
 *     tags: [Mobile]
 */
router.post('/push-token', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
        const userId = (0, auth_1.getRequestUserId)(req) || '';
        const { expoPushToken, platform } = req.body;
        if (!expoPushToken) {
            return res
                .status(400)
                .json({ success: false, message: 'expoPushToken es obligatorio' });
        }
        await PushDispatchService_1.PushDispatchService.registerToken({
            userId,
            expoPushToken,
            platform: platform || 'unknown',
            role: user?.role || 'citizen',
        });
        res.status(200).json({
            success: true,
            message: 'Dispositivo suscrito a alertas críticas Push',
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'No se pudo registrar el token Push',
        });
    }
});
router.delete('/push-token', auth_1.requireAuth, async (req, res) => {
    try {
        const { expoPushToken } = req.body;
        if (expoPushToken) {
            await PushDispatchService_1.PushDispatchService.deactivateToken(expoPushToken);
        }
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: 'Error desactivando token Push' });
    }
});
// GET /api/mobile/alerts/me
router.get('/alerts/me', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = (0, auth_1.getRequestUserId)(req);
        if (!userId || !system_1.UUID_REGEX.test(userId)) {
            return res.json({ success: true, data: [] });
        }
        const alertsRes = await (0, connection_1.getPgPool)().query(`SELECT id, type, status, address, description, created_at, ST_AsText(location) AS location_wkt, location
       FROM public.alerts
       WHERE user_id = $1 AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 10`, [userId]);
        res.json({
            success: true,
            data: alertsRes.rows.map((a) => {
                const coords = (0, postgis_1.parsePostgisPoint)(a.location_wkt ?? a.location);
                const lat = coords?.latitude ?? 0;
                const lng = coords?.longitude ?? 0;
                return {
                    id: a.id,
                    type: a.type,
                    status: a.status,
                    location: { address: a.address, latitude: lat, longitude: lng },
                    description: a.description,
                    createdAt: a.created_at,
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
        const userId = (0, auth_1.getRequestUserId)(req) || '';
        const existing = await Alert_1.default.findById(id);
        if (!existing || (existing.userId || existing.user_id) !== userId) {
            return res
                .status(404)
                .json({ success: false, message: 'Alerta no encontrada o no autorizada' });
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