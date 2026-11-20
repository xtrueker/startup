"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoCameraRepository = exports.SupabaseCameraRepository = void 0;
const Camera_1 = __importDefault(require("../../../infrastructure/database/models/Camera"));
// Adaptador de salida (Adapter) - Implementación concreta sobre Supabase PostgreSQL
class SupabaseCameraRepository {
    async create(data) {
        return await Camera_1.default.create(data);
    }
    async findAll() {
        return await Camera_1.default.find();
    }
    async findById(id) {
        return await Camera_1.default.findById(id);
    }
    async update(id, data) {
        return await Camera_1.default.update(id, data);
    }
    async delete(id) {
        return await Camera_1.default.delete(id);
    }
}
exports.SupabaseCameraRepository = SupabaseCameraRepository;
/** @deprecated Alias retrocompatible preservado para consumidores existentes */
exports.MongoCameraRepository = SupabaseCameraRepository;
//# sourceMappingURL=CameraRepository.js.map