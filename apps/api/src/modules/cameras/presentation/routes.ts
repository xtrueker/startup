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
    const authReq = req as any;
    const body = {
      ...req.body,
      authorityId: req.body.authorityId || authReq.user?.userId || authReq.user?.id || '00000000-0000-0000-0000-000000000000'
    };
    const newCamera = await cameraService.createCamera(body);
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