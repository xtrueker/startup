"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
// Cargar variables desde archivo .env
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Función que valida y devuelve la configuración
function validateEnv() {
    // Verificar que existan variables críticas
    if (!process.env.JWT_SECRET) {
        throw new Error('Falta JWT_SECRET en variables de entorno');
    }
    if (!process.env.MONGODB_URI) {
        throw new Error('Falta MONGODB_URI en variables de entorno');
    }
    // Devolver objeto con valores (o valores por defecto)
    return {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: parseInt(process.env.PORT || '3001', 10),
        MONGODB_URI: process.env.MONGODB_URI,
        JWT_SECRET: process.env.JWT_SECRET,
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
        REDIS_URL: process.env.REDIS_URL,
    };
}
// Exportar configuración validada
exports.env = validateEnv();
//# sourceMappingURL=env.js.map