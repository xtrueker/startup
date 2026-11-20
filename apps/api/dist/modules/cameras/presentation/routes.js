"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cameraRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../../shared/middlewares/auth");
const system_1 = require("../../../shared/constants/system");
const CameraRepository_1 = require("../infrastructure/CameraRepository");
const CameraService_1 = require("../application/CameraService");
const cameraRepository = new CameraRepository_1.SupabaseCameraRepository();
const cameraService = new CameraService_1.CameraService(cameraRepository);
const router = (0, express_1.Router)();
exports.cameraRouter = router;
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.COMMAND_CENTER_ROLES), async (req, res) => {
    try {
        const body = {
            ...req.body,
            authorityId: req.body.authorityId || (0, auth_1.getRequestUserId)(req) || system_1.FALLBACK_AUTHORITY_UUID,
        };
        const newCamera = await cameraService.createCamera(body);
        return res.status(201).json({
            success: true,
            message: 'Cámara creada exitosamente',
            data: { camera: newCamera },
        });
    }
    catch (error) {
        const isValidationError = error.message === 'Faltan datos obligatorios';
        return res.status(isValidationError ? 400 : 500).json({
            success: false,
            message: isValidationError ? error.message : 'Error interno del servidor',
        });
    }
});
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.ALL_AUTHENTICATED_ROLES), async (req, res) => {
    try {
        const userRole = req.user?.role;
        const cameras = await cameraService.getAllCameras();
        // Los ciudadanos reciben únicamente las cámaras comunitarias públicas sin exponer URLs internas RTSP
        const responseData = userRole === 'citizen'
            ? cameras
                .filter((cam) => cam.isPublic !== false)
                .map((cam) => ({
                ...cam,
                streamUrl: '',
            }))
            : cameras;
        return res.json({
            success: true,
            count: responseData.length,
            data: responseData,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.COMMAND_CENTER_ROLES), async (req, res) => {
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
});
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(system_1.COMMAND_CENTER_ROLES), async (req, res) => {
    try {
        const deleted = await cameraService.deleteCamera(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Cámara no encontrada' });
        }
        return res.json({
            success: true,
            message: 'Cámara eliminada exitosamente'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
});
//# sourceMappingURL=routes.js.map