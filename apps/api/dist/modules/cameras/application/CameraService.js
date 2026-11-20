"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CameraService = void 0;
const socket_1 = require("../../../shared/utils/socket");
const postgis_1 = require("../../../shared/utils/postgis");
const system_1 = require("../../../shared/constants/system");
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
            coverageRadius: coverageRadius || system_1.DEFAULT_CAMERA_COVERAGE_RADIUS_M,
            isPublic: isPublic || false,
            authorityId,
        });
        const cameraDTO = this.mapToDTO(camera);
        (0, socket_1.emitToOperatorsAndRoot)('camera:new', cameraDTO);
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
        (0, socket_1.emitToOperatorsAndRoot)('camera:updated', cameraDTO);
        return cameraDTO;
    }
    async deleteCamera(id) {
        const deleted = await this.cameraRepository.delete(id);
        if (deleted) {
            (0, socket_1.emitToOperatorsAndRoot)('camera:deleted', { id });
        }
        return deleted;
    }
    mapToDTO(camera) {
        const parsedCoords = (0, postgis_1.parsePostgisPoint)(camera.location);
        const lat = parsedCoords ? parsedCoords.latitude : 0;
        const lng = parsedCoords ? parsedCoords.longitude : 0;
        return {
            id: camera.id || camera._id,
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
}
exports.CameraService = CameraService;
//# sourceMappingURL=CameraService.js.map