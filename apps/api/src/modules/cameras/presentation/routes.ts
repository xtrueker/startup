import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../../shared/middlewares/auth';
import { MongoCameraRepository } from '../infrastructure/CameraRepository';
import { CameraService } from '../application/CameraService';

// 1. Inyección de Dependencias (Ideal usar TypeDI o NestJS a futuro)
const cameraRepository = new MongoCameraRepository();
const cameraService = new CameraService(cameraRepository);

const router = Router();

// 2. Controladores Ligeros (Solo gestionan HTTP y respuestas)
router.post('/', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (req: Request, res: Response) => {
  try {
    const newCamera = await cameraService.createCamera(req.body);
    return res.status(201).json({
      success: true,
      message: 'Cámara creada exitosamente',
      data: { camera: newCamera },
    });
  } catch (error: any) {
    const isValidationError = error.message === 'Faltan datos obligatorios';
    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: isValidationError ? error.message : 'Error interno del servidor',
    });
  }
});

router.get('/', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (_req: Request, res: Response) => {
  try {
    let cameras = await cameraService.getAllCameras();
    
    // --- MOCK SIMULADOR DE CÁMARAS ---
    if (cameras.length === 0) {
      cameras = Array.from({ length: 5 }).map((_, i) => ({
        id: `mock-cam-${i}`,
        name: `Cámara Vigilancia P0${i + 1}`,
        location: {
          latitude: 4.6097 + (Math.random() - 0.5) * 0.05,
          longitude: -74.0817 + (Math.random() - 0.5) * 0.05,
          address: `Poste de Luz ${Math.floor(Math.random() * 1000)}`
        },
        // Un video dummy público para que el iframe del frontend muestre movimiento
        streamUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', 
        status: 'active',
      })) as any;
    }
    // ---------------------------------

    return res.json({
      success: true,
      count: cameras.length,
      data: cameras,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

router.put('/:id', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (req: Request, res: Response) => {
  try {
    const updatedCamera = await cameraService.updateCamera(req.params.id, req.body);
    if (!updatedCamera) {
      return res.status(404).json({ success: false, message: 'Cámara no encontrada' });
    }
    return res.json({
      success: true,
      message: 'Cámara actualizada exitosamente',
      data: { camera: updatedCamera },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
});

router.delete('/:id', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (req: Request, res: Response) => {
  try {
    const deleted = await cameraService.deleteCamera(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Cámara no encontrada' });
    }
    return res.json({
      success: true,
      message: 'Cámara eliminada exitosamente'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
});

export { router as cameraRouter };