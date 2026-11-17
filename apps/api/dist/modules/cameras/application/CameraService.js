"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CameraService = void 0;
const socket_1 = require("../../../shared/utils/socket");
const postgis_1 = require("../../../shared/utils/postgis");
class CameraService {
    constructor(cameraRepository) {
        this.cameraRepository = cameraRepository;
    }
    async createCamera(data) {
        const { name, latitude, longitude, address, streamUrl, coverageRadius, isPublic, authorityId } = data;
        if (!name || !latitude || !longitude || !address || !streamUrl || !authorityId) {
            throw new Error('Faltan datos obligatorios');
        }
        const camera = await this.cameraRepository.create({
            name,
            latitude,
            longitude,
            address,
            streamUrl,
            status: 'online',
            coverageRadius: coverageRadius || 100,
            isPublic: isPublic || false,
            authorityId,
        });
        const cameraDTO = this.mapToDTO(camera);
        this.emitWebSocketEvent('camera:new', cameraDTO);
        return cameraDTO;
    }
    async getAllCameras() {
        const cameras = await this.cameraRepository.findAll();
        return cameras.map(c => this.mapToDTO(c));
    }
    async updateCamera(id, data) {
        const updated = await this.cameraRepository.update(id, data);
        if (!updated)
            return null;
        const cameraDTO = this.mapToDTO(updated);
        this.emitWebSocketEvent('camera:updated', cameraDTO);
        return cameraDTO;
    }
    async deleteCamera(id) {
        const deleted = await this.cameraRepository.delete(id);
        if (deleted) {
            this.emitWebSocketEvent('camera:deleted', { id });
        }
        return deleted;
    }
    mapToDTO(camera) {
        const parsedCoords = (0, postgis_1.parsePostgisPoint)(camera.location);
        const lat = parsedCoords ? parsedCoords.latitude : 0;
        const lng = parsedCoords ? parsedCoords.longitude : 0;
        return {
            id: camera.id || camera._id, // soporta ambos
            name: camera.name,
            location: {
                latitude: lat,
                longitude: lng,
                address: camera.address || '',
            },
            streamUrl: camera.stream_url || camera.streamUrl,
            status: camera.status,
            coverageRadius: camera.coverage_radius || camera.coverageRadius,
            isPublic: camera.is_public !== undefined ? camera.is_public : camera.isPublic,
        };
    }
    emitWebSocketEvent(event, payload) {
        try {
            (0, socket_1.getSocket)().emit(event, payload);
            (0, socket_1.emitToOperators)(event, payload);
        }
        catch (wsError) {
            console.error(`Error emitiendo WebSocket (${event}):`, wsError);
        }
    }
}
exports.CameraService = CameraService;
//# sourceMappingURL=CameraService.js.map