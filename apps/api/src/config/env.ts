// Cargar variables desde archivo .env
import dotenv from 'dotenv';
dotenv.config();

// Interfaz: define qué variables esperamos
interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  REDIS_URL?: string;
}

// Función que valida y devuelve la configuración
function validateEnv(): EnvConfig {
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
export const env = validateEnv();