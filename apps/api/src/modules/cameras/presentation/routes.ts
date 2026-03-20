import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../../shared/middlewares/auth';
import { MongoCameraRepository } from '../infrastructure/CameraRepository';
import { CameraService } from '../application/CameraService';

// 1. Inyección de Dependencias (Ideal usar TypeDI o NestJS a futuro)
const cameraRepository = new MongoCameraRepository();
const cameraService = new CameraService(cameraRepository);

const router = Router();

// 2. Controladores Ligeros (Solo gestionan HTTP y respuestas)
router.post('/', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
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

router.get('/', async (req: Request, res: Response) => {
  try {
    const cameras = await cameraService.getAllCameras();
    return res.json({
      success: true,
      count: cameras.length,
      data: cameras,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

export { router as cameraRouter };