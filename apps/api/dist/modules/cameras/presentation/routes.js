"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cameraRouter = void 0;
const express_1 = require("express");
const Camera_1 = __importDefault(require("../../../infrastructure/database/models/Camera"));
const auth_1 = require("../../../shared/middlewares/auth");
const socket_1 = require("../../../shared/utils/socket");
const router = (0, express_1.Router)();
exports.cameraRouter = router;
// CREAR CÁMARA
// POST /api/cameras
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor']), async (req, res) => {
    try {
        const { name, latitude, longitude, address, streamUrl, coverageRadius, isPublic, authorityId } = req.body;
        if (!name || !latitude || !longitude || !address || !streamUrl || !authorityId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos obligatorios',
            });
        }
        const camera = await Camera_1.default.create({
            name,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
                address,
            },
            streamUrl,
            status: 'online',
            coverageRadius: coverageRadius || 100,
            isPublic: isPublic || false,
            authorityId,
        });
        const cameraData = {
            id: camera._id,
            name: camera.name,
            location: {
                latitude: camera.location.coordinates[1],
                longitude: camera.location.coordinates[0],
                address: camera.location.address,
            },
            streamUrl: camera.streamUrl,
            status: camera.status,
            coverageRadius: camera.coverageRadius,
            isPublic: camera.isPublic,
        };
        try {
            (0, socket_1.getSocket)().emit('camera:new', cameraData);
            (0, socket_1.emitToOperators)('camera:new', cameraData);
        }
        catch (wsError) {
            console.error('Error emitiendo WebSocket (camera:new):', wsError);
        }
        res.status(201).json({
            success: true,
            message: 'Cámara creada exitosamente',
            data: { camera: cameraData },
        });
    }
    catch (error) {
        console.error('Error creando cámara:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message,
        });
    }
});
// OBTENER TODAS LAS CÁMARAS
// GET /api/cameras
router.get('/', async (req, res) => {
    try {
        const cameras = await Camera_1.default.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: cameras.length,
            data: cameras.map(camera => ({
                id: camera._id,
                name: camera.name,
                location: {
                    latitude: camera.location.coordinates[1],
                    longitude: camera.location.coordinates[0],
                    address: camera.location.address,
                },
                streamUrl: camera.streamUrl,
                status: camera.status,
                coverageRadius: camera.coverageRadius,
                isPublic: camera.isPublic,
            })),
        });
    }
    catch (error) {
        console.error('Error obteniendo cámaras:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});
// ACTUALIZAR CÁMARA
// PUT /api/cameras/:id
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor']), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const camera = await Camera_1.default.findByIdAndUpdate(id, updateData, { new: true });
        if (!camera) {
            return res.status(404).json({
                success: false,
                message: 'Cámara no encontrada',
            });
        }
        const cameraData = {
            id: camera._id,
            name: camera.name,
            location: {
                latitude: camera.location.coordinates[1],
                longitude: camera.location.coordinates[0],
                address: camera.location.address,
            },
            streamUrl: camera.streamUrl,
            status: camera.status,
            coverageRadius: camera.coverageRadius,
            isPublic: camera.isPublic,
        };
        try {
            (0, socket_1.getSocket)().emit('camera:updated', cameraData);
            (0, socket_1.emitToOperators)('camera:updated', cameraData);
        }
        catch (wsError) {
            console.error('Error emitiendo WebSocket (camera:updated):', wsError);
        }
        res.json({
            success: true,
            message: 'Cámara actualizada',
            data: { camera: cameraData },
        });
    }
    catch (error) {
        console.error('Error actualizando cámara:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});
// ELIMINAR CÁMARA
// DELETE /api/cameras/:id
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['admin', 'supervisor']), async (req, res) => {
    try {
        const { id } = req.params;
        const camera = await Camera_1.default.findByIdAndDelete(id);
        if (!camera) {
            return res.status(404).json({ success: false, message: 'Cámara no encontrada' });
        }
        try {
            (0, socket_1.getSocket)().emit('camera:deleted', { id });
            (0, socket_1.emitToOperators)('camera:deleted', { id });
        }
        catch (wsError) {
            console.error('Error emitiendo WebSocket (camera:deleted):', wsError);
        }
        res.json({ success: true, message: 'Cámara eliminada exitosamente' });
    }
    catch (error) {
        console.error('Error eliminando cámara:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
});
//# sourceMappingURL=routes.js.map