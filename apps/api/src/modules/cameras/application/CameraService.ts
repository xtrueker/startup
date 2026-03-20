import { ICameraRepository } from '../infrastructure/CameraRepository';
import { getSocket, emitToOperators } from '../../../../shared/utils/socket';

export class CameraService {
  constructor(private readonly cameraRepository: ICameraRepository) {}

  async createCamera(data: any) {
    const { name, latitude, longitude, address, streamUrl, coverageRadius, isPublic, authorityId } = data;

    if (!name || !latitude || !longitude || !address || !streamUrl || !authorityId) {
      throw new Error('Faltan datos obligatorios');
    }

    const camera = await this.cameraRepository.create({
      name,
      location: { type: 'Point', coordinates: [longitude, latitude], address },
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
    return cameras.map(this.mapToDTO);
  }

  // Capa de transformación (DTO) para no exponer el modelo de BD directamente a la UI
  private mapToDTO(camera: any) {
    return {
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
  }

  private emitWebSocketEvent(event: string, payload: any) {
    try {
      getSocket().emit(event, payload);
      emitToOperators(event, payload);
    } catch (wsError) {
      console.error(`Error emitiendo WebSocket (${event}):`, wsError);
    }
  }
}
