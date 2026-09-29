import { Router, Request, Response } from 'express';
import Alert from '../../../infrastructure/database/models/Alert';
import { requireAuth, requireRole } from '../../../shared/middlewares/auth';
import { calculateEscapeRoutes } from '../services/escapeRouting';
import { getSocket, emitToOperators } from '../../../shared/utils/socket';
import { AuditService } from '../../../shared/services/AuditService';
import { supabase } from '../../../infrastructure/database/connection';

const router = Router();

// CREAR ALERTA DE EMERGENCIA
// POST /api/alerts
router.post('/', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (req: Request, res: Response) => {
  console.log('INFO: POST /api/alerts called');
  try {
    const { userId, type, latitude, longitude, address, description, direction } = req.body;

    if (!userId || !latitude || !longitude) {
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
      getSocket().emit('alert:new', alertData);
      emitToOperators('alert:new', alertData);
    } catch (wsError) {
      console.error('Error emitiendo WebSocket:', wsError);
    }

    res.status(201).json({ success: true, message: 'Alerta creada exitosamente', data: { alert: alertData } });

  } catch (error: any) {
    console.error('ERROR creando alerta:', error.message);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
});

// OBTENER TODAS LAS ALERTAS ACTIVAS
// GET /api/alerts
router.get('/', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (_req: Request, res: Response) => {
  console.log('INFO: GET /api/alerts called');
  try {
    const alerts = await Alert.findActive(50);

    res.json({
      success: true,
      count: alerts.length,
      data: alerts.map((alert: any) => {
        let lat = 0, lng = 0;
        if (alert.location && typeof alert.location === 'object' && alert.location.coordinates) {
           lng = alert.location.coordinates[0];
           lat = alert.location.coordinates[1];
        } else if (typeof alert.location === 'string') {
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

  } catch (error: any) {
    console.error('ERROR obteniendo alertas:', error.message);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
});

// ELIMINAR/RESOLVER ALERTA
// DELETE /api/alerts/:id
router.delete('/:id', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (req: Request, res: Response) => {
  console.log(`INFO: DELETE /api/alerts/${req.params.id} called`);
  try {
    const { id } = req.params;
    const adminId = (req as any).user?.id || 'system';
    
    await Alert.archive(id, adminId);

    try {
      getSocket().emit('alert:deleted', { id });
      emitToOperators('alert:deleted', { id });
    } catch (wsError) {
      console.error('Error emitiendo WebSocket:', wsError);
    }

    res.json({ success: true, message: 'Alerta resuelta y archivada históricamente' });

  } catch (error: any) {
    console.error('ERROR eliminando alerta:', error.message);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
});

// ACTUALIZAR ESTADO DE ALERTA (MÁQUINA DE ESTADOS)
// PATCH /api/alerts/:id/status
router.patch('/:id/status', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (req: Request, res: Response) => {
  console.log(`INFO: PATCH /api/alerts/${req.params.id}/status called`);
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const actorId = (req as any).user?.id || (req as any).user?.userId || 'system';

    const validStatuses = ['pending', 'reviewing', 'verified', 'resolved', 'discarded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    const alertBefore = await Alert.findById(id);
    const oldStatus = alertBefore ? alertBefore.status : 'unknown';

    // Call DAO which handles the update and also logs the event in alert_events
    await Alert.updateStatus(id, status, actorId, notes);

    // General Audit tracking
    try {
      await AuditService.logAlertTransition(actorId, id, oldStatus, status, req.ip);
    } catch (auditErr: any) {
      console.warn('⚠️ Warning: AuditService.logAlertTransition failed, but skipping crash:', auditErr.message);
    }

    // Broadcast update
    try {
      getSocket().emit('alert:updated', { id, status });
      emitToOperators('alert:updated', { id, status });
    } catch (wsError) {
      console.error('Error emitiendo WebSocket:', wsError);
    }

    res.json({ success: true, message: `Estado de alerta actualizado a ${status}` });
  } catch (error: any) {
    console.error('ERROR actualizando estado de alerta:', error.message);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
});

// HISTORIAL DE EVENTOS DE ALERTA
// GET /api/alerts/:id/events
router.get('/:id/events', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase()
      .from('alert_events')
      .select('id, event_type, previous_status, new_status, notes, created_at')
      .eq('alert_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('ERROR obteniendo eventos de alerta:', error.message);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
});

export { router as alertRouter };