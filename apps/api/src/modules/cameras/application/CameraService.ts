import { ICameraRepository } from '../infrastructure/CameraRepository';
import { getSocket, emitToOperators } from '../../../shared/utils/socket';

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

  async updateCamera(id: string, data: any) {
    const updated = await this.cameraRepository.update(id, data);
    if (!updated) return null;
    const cameraDTO = this.mapToDTO(updated);
    this.emitWebSocketEvent('camera:updated', cameraDTO);
    return cameraDTO;
  }

  async deleteCamera(id: string) {
    const deleted = await this.cameraRepository.delete(id);
    if (deleted) {
      this.emitWebSocketEvent('camera:deleted', { id });
    }
    return deleted;
  }

  private mapToDTO(camera: any) {
    let lat = 0, lng = 0;
    if (camera.location && typeof camera.location === 'object' && camera.location.coordinates) {
       lng = camera.location.coordinates[0];
       lat = camera.location.coordinates[1];
    } else if (typeof camera.location === 'string') {
       // fallback si viene en WKT
       const match = camera.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
       if (match) {
         lng = parseFloat(match[1]);
         lat = parseFloat(match[2]);
       }
    }

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

  private emitWebSocketEvent(event: string, payload: any) {
    try {
      getSocket().emit(event, payload);
      emitToOperators(event, payload);
    } catch (wsError) {
      console.error(`Error emitiendo WebSocket (${event}):`, wsError);
    }
  }
}
