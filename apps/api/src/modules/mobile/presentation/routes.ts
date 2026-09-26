import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../shared/middlewares/auth';
import Alert from '../../../infrastructure/database/models/Alert';
import { supabase, getPgPool } from '../../../infrastructure/database/connection';
import { emitToOperators, emitToAlertRoom } from '../../../shared/utils/socket';

const router = Router();

// POST /api/mobile/panic
router.post('/panic', requireAuth, async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, address, description } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?.id;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'latitude y longitude son obligatorios' });
    }

    const alert = await Alert.create({
      userId,
      type: (req.body.type as any) || 'emergency',
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

    emitToOperators('alert:new', alertData);

    res.status(201).json({
      success: true,
      message: 'Pánico registrado. Ayuda en camino.',
      data: { alertId: alert.id, status: alert.status },
    });
  } catch (error: any) {
    console.error('Error activando pánico:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// POST /api/mobile/location
router.post('/location', requireAuth, async (req: Request, res: Response) => {
  try {
    const { alertId, latitude, longitude, accuracy, speed, heading } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?.id;

    if (!alertId || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'alertId, latitude y longitude son obligatorios' });
    }

    const locationData = {
      userId, alertId, latitude, longitude, accuracy: accuracy || null, speed: speed || null, heading: heading || null, timestamp: new Date().toISOString(),
    };

    emitToAlertRoom(alertId, 'user:location_update', locationData);
    
    // Log location update in event sourcing
    const pool = getPgPool();
    await pool.query(`
      INSERT INTO alert_events (alert_id, actor_id, event_type, location, notes)
      VALUES ($1, $2, 'location_update', ST_GeomFromText($3, 4326), 'Mobile live location update')
    `, [alertId, userId, `POINT(${longitude} ${latitude})`]);

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error actualizando ubicación:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/mobile/alerts/me
router.get('/alerts/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const pool = getPgPool();
    const { rows: alerts } = await pool.query(`
      SELECT id, type, status, address, description, created_at, ST_AsText(location) as location
      FROM alerts
      WHERE user_id = $1 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    res.json({
      success: true,
      data: alerts.map((a: any) => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// PATCH /api/mobile/alerts/:id/cancel
router.patch('/alerts/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId || (req as any).user?.id;

    const sb = supabase();
    const { data: existing } = await sb.from('alerts').select('*').eq('id', id).single();
    
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ success: false, message: 'Alerta no encontrada o no autorizada' });
    }

    await Alert.updateStatus(id, 'discarded', userId, 'Cancelled by mobile user');
    emitToOperators('alert:cancelled', { id, userId, reason: 'false_alarm' });

    res.json({ success: true, message: 'Alerta cancelada' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

export { router as mobileRouter };
