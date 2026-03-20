import Camera from '../../../infrastructure/database/models/Camera';

// Puerto de salida (Port) - Debería estar en domain/
export interface ICameraRepository {
  create(data: any): Promise<any>;
  findAll(): Promise<any[]>;
  findById(id: string): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<any>;
}

// Adaptador de salida (Adapter) - Implementación concreta usando Mongoose
export class MongoCameraRepository implements ICameraRepository {
  async create(data: any) {
    return await Camera.create(data);
  }

  async findAll() {
    return await Camera.find().sort({ createdAt: -1 });
  }

  async findById(id: string) {
    return await Camera.findById(id);
  }

  async update(id: string, data: any) {
    return await Camera.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string) {
    return await Camera.findByIdAndDelete(id);
  }
}
