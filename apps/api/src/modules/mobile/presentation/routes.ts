import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { requireAuth } from '../../../shared/middlewares/auth';
import Alert from '../../../infrastructure/database/models/Alert';
import { supabase } from '../../../infrastructure/database/connection';
import { emitToOperators, emitToAlertRoom } from '../../../shared/utils/socket';

const router = Router();

// POST /api/mobile/panic - Resiliente ante emergencias con o sin sesión activa
router.post('/panic', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, address, description } = req.body;
    let userId = (req as any).user?.userId || (req as any).user?.id;

    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const payload = jwt.verify(token, env.JWT_SECRET) as any;
          userId = payload?.userId || payload?.id;
        } catch (_) {}
      }
    }

    // Fallback a ID de emergencia ciudadana anónima si no hay sesión
    if (!userId) {
      userId = '00000000-0000-0000-0000-000000000002';
    }

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
router.post('/location', async (req: Request, res: Response) => {
  try {
    const { alertId, latitude, longitude, accuracy, speed, heading } = req.body;
    let userId = (req as any).user?.userId || (req as any).user?.id;

    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const payload = jwt.verify(token, env.JWT_SECRET) as any;
          userId = payload?.userId || payload?.id;
        } catch (_) {}
      }
    }

    if (!userId) {
      userId = '00000000-0000-0000-0000-000000000002'; // Anonymous fallback
    }

    if (!alertId || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'alertId, latitude y longitude son obligatorios' });
    }

    const locationData = {
      userId, alertId, latitude, longitude, accuracy: accuracy || null, speed: speed || null, heading: heading || null, timestamp: new Date().toISOString(),
    };

    emitToAlertRoom(alertId, 'user:location_update', locationData);
    
    // Log location update in event sourcing
    try {
      await supabase().from('alert_events').insert({
        alert_id: alertId,
        actor_id: userId,
        event_type: 'location_update',
        location: `POINT(${longitude} ${latitude})`,
        notes: 'Mobile live location update'
      });
    } catch (lErr: any) {
      console.warn('Warning logging mobile location update:', lErr.message);
    }

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
    const { data: alerts, error } = await supabase()
      .from('alerts')
      .select('id, type, status, address, description, created_at, location')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({
      success: true,
      data: (alerts || []).map((a: any) => {
        let lat = 0, lng = 0;
        if (typeof a.location === 'object' && a.location?.coordinates) {
          lng = a.location.coordinates[0];
          lat = a.location.coordinates[1];
        } else if (typeof a.location === 'string') {
          const match = a.location.match(/POINT\(([^ ]+) ([^)]+)\)/);
          if (match) {
            lng = parseFloat(match[1]);
            lat = parseFloat(match[2]);
          }
        }
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
