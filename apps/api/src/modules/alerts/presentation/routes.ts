import { Router, Request, Response } from 'express';
import Alert, { HydratedAlertRecord } from '../../../infrastructure/database/models/Alert';
import {
  requireAuth,
  requireRole,
  getRequestUserId,
} from '../../../shared/middlewares/auth';
import {
  ALERT_VALID_STATUSES,
  AUTHORITY_ROLES,
  COMMAND_CENTER_ROLES,
  UUID_REGEX,
} from '../../../shared/constants/system';
import { calculateEscapeRoutes } from '../services/escapeRouting';
import { emitToOperatorsAndRoot, dispatchTacticalAlert } from '../../../shared/utils/socket';
import { resolveRequestBaseUrl } from '../../../shared/utils/url';
import { AuditService } from '../../../shared/services/AuditService';
import { getPgPool } from '../../../infrastructure/database/connection';
import { User } from '../../../infrastructure/database/models';
import { EvidenceStorageService } from '../../mobile/services/EvidenceStorageService';

const router = Router();

function formatAlertDTO(alert: HydratedAlertRecord) {
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
router.post('/', requireAuth, requireRole(COMMAND_CENTER_ROLES), async (req: Request, res: Response) => {
  try {
    const { userId, type, latitude, longitude, address, description, direction } = req.body;

    if (!userId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
    }

    let escapeRoutes: any[] = [];
    if (type === 'robo' && direction) {
      escapeRoutes = await calculateEscapeRoutes(latitude, longitude, direction);
    }

    const alert = await Alert.create({
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

    emitToOperatorsAndRoot('alert:new', alertData);

    res.status(201).json({ success: true, message: 'Alerta creada exitosamente', data: { alert: alertData } });
  } catch (error: any) {
    console.error('ERROR creando alerta:', error.message);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
});

// OBTENER TODAS LAS ALERTAS ACTIVAS
// GET /api/alerts
router.get('/', requireAuth, requireRole(COMMAND_CENTER_ROLES), async (_req: Request, res: Response) => {
  try {
    const alerts = await Alert.findActive(50);

    res.json({
      success: true,
      count: alerts.length,
      data: alerts.map(formatAlertDTO),
    });
  } catch (error: any) {
    console.error('ERROR obteniendo alertas:', error.message);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
});

// ELIMINAR/RESOLVER ALERTA
// DELETE /api/alerts/:id
router.delete('/:id', requireAuth, requireRole(COMMAND_CENTER_ROLES), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorId = getRequestUserId(req) || 'system';

    await Alert.archive(id, actorId);
    emitToOperatorsAndRoot('alert:deleted', { id });

    res.json({ success: true, message: 'Alerta resuelta y archivada históricamente' });
  } catch (error: any) {
    console.error('ERROR eliminando alerta:', error.message);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
});

// ACTUALIZAR ESTADO DE ALERTA (MÁQUINA DE ESTADOS)
// PATCH /api/alerts/:id/status
router.patch('/:id/status', requireAuth, requireRole(COMMAND_CENTER_ROLES), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const actorId = getRequestUserId(req) || 'system';

    if (!ALERT_VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    const alertBefore = await Alert.findById(id);
    const oldStatus = alertBefore ? alertBefore.status : 'unknown';

    await Alert.updateStatus(id, status, actorId, notes);

    try {
      await AuditService.logAlertTransition(actorId, id, oldStatus, status, req.ip);
    } catch (auditErr: any) {
      console.warn('⚠️ Warning: AuditService.logAlertTransition failed, but skipping crash:', auditErr.message);
    }

    emitToOperatorsAndRoot('alert:updated', { id, status });

    res.json({ success: true, message: `Estado de alerta actualizado a ${status}` });
  } catch (error: any) {
    console.error('ERROR actualizando estado de alerta:', error.message);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
});

// DESPACHO TÁCTICO DE ALERTA A PATRULLAS POLICIALES
// POST /api/alerts/:id/dispatch
router.post('/:id/dispatch', requireAuth, requireRole(COMMAND_CENTER_ROLES), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { officerId, notes } = req.body;

    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alerta no encontrada' });
    }

    let citizenName = 'Ciudadano en Emergencia';
    const targetUserId = alert.userId || alert.user_id;
    if (targetUserId) {
      try {
        const citizen = await User.findById(targetUserId);
        if (citizen?.full_name) {
          citizenName = citizen.full_name;
        }
      } catch (userErr) {
        console.warn('No se pudo obtener nombre del ciudadano:', userErr);
      }
    }

    const rawLat = alert.latitude ?? req.body?.latitude;
    const rawLng = alert.longitude ?? req.body?.longitude;
    const latitude =
      rawLat !== null && rawLat !== undefined && rawLat !== '' ? Number(rawLat) : NaN;
    const longitude =
      rawLng !== null && rawLng !== undefined && rawLng !== '' ? Number(rawLng) : NaN;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(422).json({
        success: false,
        message: 'La alerta no contiene coordenadas GPS válidas para el despacho táctico',
      });
    }

    dispatchTacticalAlert({
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
  } catch (error: any) {
    console.error('ERROR en despacho táctico:', error.message);
    res.status(500).json({ success: false, message: 'Error interno al despachar alerta', error: error.message });
  }
});

// HISTORIAL DE EVENTOS DE ALERTA
// GET /api/alerts/:id/events
router.get('/:id/events', requireAuth, requireRole(COMMAND_CENTER_ROLES), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'ID de alerta inválido' });
    }
    const pool = getPgPool();
    const eventsRes = await pool.query(
      `SELECT id, event_type, previous_status, new_status, notes, created_at
       FROM public.alert_events
       WHERE alert_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    res.json({ success: true, data: eventsRes.rows });
  } catch (error: any) {
    console.error('ERROR obteniendo eventos de alerta:', error.message);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
});

// EVIDENCIAS ACÚSTICAS DE UNA ALERTA (CON URLS FIRMADAS DE REPRODUCCIÓN)
// GET /api/alerts/:id/evidence
router.get('/:id/evidence', requireAuth, requireRole(AUTHORITY_ROLES), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clips = await EvidenceStorageService.listAlertEvidence(
      id,
      resolveRequestBaseUrl(req)
    );
    res.json({
      success: true,
      count: clips.length,
      data: clips,
    });
  } catch (error: any) {
    console.error('ERROR obteniendo evidencias de alerta:', error.message);
    res.status(500).json({ success: false, message: 'Error obteniendo evidencias de audio' });
  }
});

export { router as alertRouter };