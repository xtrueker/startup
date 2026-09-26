"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scannerRouter = void 0;
const express_1 = require("express");
const CameraScanner_1 = require("../../../infrastructure/scanner/CameraScanner");
const auth_1 = require("../../../shared/middlewares/auth");
const router = (0, express_1.Router)();
exports.scannerRouter = router;
// GET /api/cameras/discover - Descubrir cámara automáticamente
router.get('/discover', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor', 'operator']), async (req, res) => {
    try {
        const force = req.query.force === 'true';
        let ip;
        if (force) {
            ip = await CameraScanner_1.cameraScanner.forceRescan();
        }
        else {
            ip = await CameraScanner_1.cameraScanner.getCameraIP();
        }
        if (ip) {
            res.json({
                success: true,
                cameraIP: ip,
                rtspUrl: `rtsp://${ip}/stream`,
                lastScan: new Date().toISOString(),
            });
        }
        else {
            res.status(404).json({
                success: false,
                message: 'Cámara no encontrada en la red',
                suggestion: 'Verifica que la cámara esté encendida y conectada',
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error escaneando red',
            error: error.message,
        });
    }
});
// GET /api/cameras/status - Estado del escaneo
router.get('/status', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor', 'operator']), async (_req, res) => {
    const ip = await CameraScanner_1.cameraScanner.getCameraIP();
    res.json({
        success: true,
        cameraDetected: !!ip,
        currentIP: ip,
        timestamp: new Date().toISOString(),
    });
});
//# sourceMappingURL=scannerRoutes.js.map