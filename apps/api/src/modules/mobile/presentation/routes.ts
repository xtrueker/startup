import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../shared/middlewares/auth';
import Alert from '../../../infrastructure/database/models/Alert';
import { emitToOperators, emitToAlertRoom } from '../../../shared/utils/socket';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mobile/panic
// Triggered by the Mobile App panic button.
// Creates an alert and broadcasts it to all operator clients.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/panic', requireAuth, async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, address, description, deviceInfo } = req.body;
    const userId = (req as any).user?.userId;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'latitude y longitude son obligatorios' });
    }

    const alert = await Alert.create({
      userId,
      type: 'emergency',
      status: 'active',
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
        address: address || '',
      },
      description: description || 'Pánico activado desde aplicación móvil',
      deviceInfo: deviceInfo || null,
    });

    const alertData = {
      id: alert._id.toString(),
      userId,
      type: alert.type,
      status: alert.status,
      source: 'mobile',  // Tag so the web UI can show a mobile icon
      location: {
        latitude: alert.location.coordinates[1],
        longitude: alert.location.coordinates[0],
        address: alert.location.address,
      },
      description: alert.description,
      createdAt: alert.createdAt,
    };

    // Emit to ALL operators immediately
    emitToOperators('alert:new', alertData);

    res.status(201).json({
      success: true,
      message: 'Pánico registrado. Ayuda en camino.',
      data: {
        alertId: alert._id.toString(),
        status: alert.status,
      },
    });

  } catch (error: any) {
    console.error('Error activando pánico:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mobile/location
// Mobile app streams live GPS position while an alert is active.
// Routes the update into the operator Room for that specific alert.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/location', requireAuth, async (req: Request, res: Response) => {
  try {
    const { alertId, latitude, longitude, accuracy, speed, heading } = req.body;
    const userId = (req as any).user?.userId;

    if (!alertId || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'alertId, latitude y longitude son obligatorios' });
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

    // Route only to operators watching this specific alert
    emitToAlertRoom(alertId, 'user:location_update', locationData);

    res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Error actualizando ubicación:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mobile/alerts/me
// Returns the active alerts for the currently authenticated mobile user.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/alerts/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    const alerts = await Alert.find({ userId, status: 'active' }).sort({ createdAt: -1 }).limit(10);

    res.json({
      success: true,
      data: alerts.map(a => ({
        id: a._id.toString(),
        type: a.type,
        status: a.status,
        location: {
          latitude: a.location.coordinates[1],
          longitude: a.location.coordinates[0],
          address: a.location.address,
        },
        description: a.description,
        createdAt: a.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/mobile/alerts/:id/cancel
// Mobile user cancels their own alert (false alarm).
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/alerts/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const alert = await Alert.findOneAndUpdate(
      { _id: id, userId },      // Only the owner can cancel
      { status: 'false_alarm' },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alerta no encontrada o ya resuelta' });
    }

    emitToOperators('alert:cancelled', { id, userId, reason: 'false_alarm' });

    res.json({ success: true, message: 'Alerta cancelada' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

export { router as mobileRouter };
