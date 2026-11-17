import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { requireAuth } from '../../../shared/middlewares/auth';
import Alert from '../../../infrastructure/database/models/Alert';
import User from '../../../infrastructure/database/models/User';
import { supabase } from '../../../infrastructure/database/connection';
import { emitToOperators, emitToAlertRoom } from '../../../shared/utils/socket';
import { EvidenceStorageService } from '../services/EvidenceStorageService';
import { verifyEvidenceStreamSignature } from '../../../shared/utils/cryptoVault';
import { PushDispatchService } from '../../../shared/services/PushDispatchService';
import { WhatsAppDispatchService } from '../../../shared/services/WhatsAppDispatchService';

const router = Router();

function extractUserFromOptionalToken(req: Request): { userId?: string; role?: string } {
  const existing = (req as any).user;
  if (existing?.userId || existing?.id) {
    return { userId: existing.userId || existing.id, role: existing.role };
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, env.JWT_SECRET) as any;
      return { userId: payload?.userId || payload?.id, role: payload?.role };
    } catch {
      return {};
    }
  }
  return {};
}

function getRequestBaseUrl(req: Request): string {
  if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL.replace(/\/+$/, '');
  const rawProto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const proto = rawProto.split(',')[0].trim();
  const host = req.get('host') || `localhost:${env.PORT}`;
  return `${proto}://${host}`;
}

/**
 * @swagger
 * /api/mobile/panic:
 *   post:
 *     summary: Activar alerta SOS ciudadana (con despacho automático Push + WhatsApp)
 *     tags: [Mobile]
 */
router.post('/panic', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, address, description, triggerType } = req.body;
    const tokenUser = extractUserFromOptionalToken(req);
    let userId = tokenUser.userId;

    if (!userId) {
      userId = '00000000-0000-0000-0000-000000000002';
    }

    if (latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ success: false, message: 'latitude y longitude son obligatorios' });
    }

    const alert = await Alert.create({
      userId,
      type: (req.body.type as any) || 'emergency',
      latitude,
      longitude,
      address,
      description: description || 'Pánico activado desde aplicación móvil',
    });

    // Consultar identidad verificada del ciudadano para enriquecer despacho sin bloquear respuesta
    let citizenProfile: any = null;
    if (userId !== '00000000-0000-0000-0000-000000000002') {
      try {
        citizenProfile = await User.findById(userId);
      } catch {
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

    emitToOperators('alert:new', alertData);

    // Despacho asíncrono en paralelo: Push a patrullas + WhatsApp operativo con link de rastreo
    const frontendBase = (env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const trackingUrl = `${frontendBase}/citizen-tracker?alertId=${encodeURIComponent(alert.id)}`;

    PushDispatchService.broadcastEmergencyToResponders({
      alertId: alert.id,
      title:
        triggerType === 'ghost_mode'
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
    }).catch(() => {});

    WhatsAppDispatchService.sendEmergencyDispatch({
      alertId: alert.id,
      citizenName: citizenProfile?.full_name,
      citizenPhone: citizenProfile?.phone,
      isVerified: Boolean(citizenProfile?.is_verified),
      latitude: Number(latitude),
      longitude: Number(longitude),
      address,
      triggerType,
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Pánico registrado. Ayuda en camino.',
      data: {
        alertId: alert.id,
        status: alert.status,
        trackingUrl,
      },
    });
  } catch (error: any) {
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
router.post('/location', async (req: Request, res: Response) => {
  try {
    const { alertId, latitude, longitude, accuracy, speed, heading } = req.body;
    const tokenUser = extractUserFromOptionalToken(req);
    const userId = tokenUser.userId || '00000000-0000-0000-0000-000000000002';

    if (!alertId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'alertId, latitude y longitude son obligatorios',
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

    emitToAlertRoom(alertId, 'user:location_update', locationData);
    emitToOperators('user:location_update', locationData);

    try {
      await supabase().from('alert_events').insert({
        alert_id: alertId,
        actor_id: userId,
        event_type: 'location_update',
        location: `POINT(${longitude} ${latitude})`,
        notes: 'Mobile live location update',
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

/**
 * @swagger
 * /api/mobile/evidence/audio:
 *   post:
 *     summary: Subir fragmento de evidencia acústica encubierta (cifrada con AES-256-GCM + SHA-256)
 *     tags: [Mobile]
 */
router.post('/evidence/audio', async (req: Request, res: Response) => {
  try {
    const { alertId, audioBase64, mimeType, chunkIndex, durationMs } = req.body;
    if (!alertId || !audioBase64) {
      return res.status(400).json({
        success: false,
        message: 'alertId y audioBase64 son obligatorios',
      });
    }

    const tokenUser = extractUserFromOptionalToken(req);
    const saved = await EvidenceStorageService.saveAudioChunk({
      alertId,
      userId: tokenUser.userId || null,
      audioBase64,
      mimeType,
      chunkIndex,
      durationMs,
      apiBaseUrl: getRequestBaseUrl(req),
    });

    // Notificar en vivo al Centro de Mando Web (compatible con useCommandStore.pushAudioChunk)
    emitToOperators('evidence:audio_chunk', {
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
  } catch (error: any) {
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
router.get('/evidence/stream/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exp = req.query.exp as string | undefined;
    const sig = req.query.sig as string | undefined;

    const validSignature = verifyEvidenceStreamSignature(id, exp, sig);
    if (!validSignature) {
      const tokenUser = extractUserFromOptionalToken(req);
      const allowedRoles = ['operator', 'supervisor', 'admin', 'police'];
      if (!tokenUser.role || !allowedRoles.includes(tokenUser.role)) {
        return res.status(403).json({
          success: false,
          message: 'Firma de acceso expirada o no autorizada',
        });
      }
    }

    const audio = await EvidenceStorageService.getDecryptedAudioById(id);
    if (!audio) {
      return res.status(404).json({
        success: false,
        message: 'Evidencia no encontrada',
      });
    }

    res.setHeader('Content-Type', audio.mimeType);
    res.setHeader('Content-Length', audio.buffer.length.toString());
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Evidence-SHA256', audio.sha256Hash);
    res.status(200).send(audio.buffer);
  } catch (error: any) {
    console.error('Error reproduciendo evidencia:', error.message);
    res.status(500).json({ success: false, message: 'Error al descifrar evidencia' });
  }
});

/**
 * @swagger
 * /api/mobile/alerts/{id}/evidence:
 *   get:
 *     summary: Listar evidencias acústicas de una alerta con cadena de custodia SHA-256
 *     tags: [Mobile]
 */
router.get('/alerts/:id/evidence', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const items = await EvidenceStorageService.listAlertEvidence(
      id,
      getRequestBaseUrl(req)
    );
    res.json({ success: true, data: items });
  } catch (error: any) {
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
router.post('/push-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.userId || user?.id;
    const { expoPushToken, platform } = req.body;

    if (!expoPushToken) {
      return res
        .status(400)
        .json({ success: false, message: 'expoPushToken es obligatorio' });
    }

    await PushDispatchService.registerToken({
      userId,
      expoPushToken,
      platform: platform || 'unknown',
      role: user?.role || 'citizen',
    });

    res.status(200).json({
      success: true,
      message: 'Dispositivo suscrito a alertas críticas Push',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'No se pudo registrar el token Push',
    });
  }
});

router.delete('/push-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const { expoPushToken } = req.body;
    if (expoPushToken) {
      await PushDispatchService.deactivateToken(expoPushToken);
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Error desactivando token Push' });
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
        let lat = 0,
          lng = 0;
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
      return res
        .status(404)
        .json({ success: false, message: 'Alerta no encontrada o no autorizada' });
    }

    await Alert.updateStatus(id, 'discarded', userId, 'Cancelled by mobile user');
    emitToOperators('alert:cancelled', { id, userId, reason: 'false_alarm' });

    res.json({ success: true, message: 'Alerta cancelada' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

export { router as mobileRouter };
