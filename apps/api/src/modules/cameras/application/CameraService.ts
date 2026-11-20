import { ICameraRepository } from '../infrastructure/CameraRepository';
import { emitToOperatorsAndRoot } from '../../../shared/utils/socket';
import { parsePostgisPoint } from '../../../shared/utils/postgis';
import { DEFAULT_CAMERA_COVERAGE_RADIUS_M } from '../../../shared/constants/system';

export class CameraService {
  constructor(private readonly cameraRepository: ICameraRepository) {}

  async createCamera(data: any) {
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
      coverageRadius: coverageRadius || DEFAULT_CAMERA_COVERAGE_RADIUS_M,
      isPublic: isPublic || false,
      authorityId,
    });

    const cameraDTO = this.mapToDTO(camera);
    emitToOperatorsAndRoot('camera:new', cameraDTO);
    return cameraDTO;
  }

  async getAllCameras() {
    const cameras = await this.cameraRepository.findAll();
    return cameras.map(c => this.mapToDTO(c));
  }

  async updateCamera(id: string, data: any) {
    const updated = await this.cameraRepository.update(id, data);
    if (!updated) return null;
    const cameraDTO = this.mapToDTO(updated);
    emitToOperatorsAndRoot('camera:updated', cameraDTO);
    return cameraDTO;
  }

  async deleteCamera(id: string) {
    const deleted = await this.cameraRepository.delete(id);
    if (deleted) {
      emitToOperatorsAndRoot('camera:deleted', { id });
    }
    return deleted;
  }

  private mapToDTO(camera: any) {
    const parsedCoords = parsePostgisPoint(camera.location);
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
