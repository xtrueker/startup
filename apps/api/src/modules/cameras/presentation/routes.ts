import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  getRequestUserId,
  AuthRequest,
} from '../../../shared/middlewares/auth';
import {
  ALL_AUTHENTICATED_ROLES,
  COMMAND_CENTER_ROLES,
  FALLBACK_AUTHORITY_UUID,
} from '../../../shared/constants/system';
import { SupabaseCameraRepository } from '../infrastructure/CameraRepository';
import { CameraService } from '../application/CameraService';

const cameraRepository = new SupabaseCameraRepository();
const cameraService = new CameraService(cameraRepository);

const router = Router();

router.post('/', requireAuth, requireRole(COMMAND_CENTER_ROLES), async (req: Request, res: Response) => {
  try {
    const body = {
      ...req.body,
      authorityId: req.body.authorityId || getRequestUserId(req) || FALLBACK_AUTHORITY_UUID,
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

router.get('/', requireAuth, requireRole(ALL_AUTHENTICATED_ROLES), async (req: Request, res: Response) => {
  try {
    const userRole = (req as AuthRequest).user?.role;
    const cameras = await cameraService.getAllCameras();

    // Los ciudadanos reciben únicamente las cámaras comunitarias públicas sin exponer URLs internas RTSP
    const responseData =
      userRole === 'citizen'
        ? cameras
            .filter((cam: any) => cam.isPublic !== false)
            .map((cam: any) => ({
              ...cam,
              streamUrl: '',
            }))
        : cameras;

    return res.json({
      success: true,
      count: responseData.length,
      data: responseData,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

router.put('/:id', requireAuth, requireRole(COMMAND_CENTER_ROLES), async (req: Request, res: Response) => {
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

router.delete('/:id', requireAuth, requireRole(COMMAND_CENTER_ROLES), async (req: Request, res: Response) => {
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