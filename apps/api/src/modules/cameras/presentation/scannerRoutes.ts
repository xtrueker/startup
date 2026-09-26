import { Router, Request, Response } from 'express';
import { cameraScanner } from '../../../infrastructure/scanner/CameraScanner';
import { requireAuth, requireRole } from '../../../shared/middlewares/auth';

const router = Router();

// GET /api/cameras/discover - Descubrir cámara automáticamente
router.get('/discover', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (req: Request, res: Response) => {
  try {
    const force = req.query.force === 'true';
    
    let ip: string | null;
    if (force) {
      ip = await cameraScanner.forceRescan();
    } else {
      ip = await cameraScanner.getCameraIP();
    }

    if (ip) {
      res.json({
        success: true,
        cameraIP: ip,
        rtspUrl: `rtsp://${ip}/stream`,
        lastScan: new Date().toISOString(),
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Cámara no encontrada en la red',
        suggestion: 'Verifica que la cámara esté encendida y conectada',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error escaneando red',
      error: error.message,
    });
  }
});

// GET /api/cameras/status - Estado del escaneo
router.get('/status', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (_req: Request, res: Response) => {
  const ip = await cameraScanner.getCameraIP();
  res.json({
    success: true,
    cameraDetected: !!ip,
    currentIP: ip,
    timestamp: new Date().toISOString(),
  });
});

export { router as scannerRouter };