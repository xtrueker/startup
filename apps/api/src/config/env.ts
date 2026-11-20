// Cargar variables desde archivo .env
import dotenv from 'dotenv';
dotenv.config();

// Interfaz: define qué variables esperamos
export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI?: string;
  JWT_SECRET: string;
  VAULT_ENCRYPTION_KEY?: string;
  FRONTEND_URL: string;
  PUBLIC_API_URL?: string;
  REDIS_URL?: string;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  DATABASE_URL?: string;
  DB_PASSWORD?: string;
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_DISPATCH_RECIPIENTS: string;
  WHATSAPP_WEBHOOK_URL?: string;
  OSRM_BASE_URL: string;
  EXPO_PUSH_API_URL: string;
  META_GRAPH_API_BASE_URL: string;
  DEFAULT_LAT: number;
  DEFAULT_LNG: number;
  REQUIRE_WS_AUTH: boolean;
}

function parseFiniteNumber(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stripWrappingQuotes(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^["']|["']$/g, '');
}

// Función que valida y devuelve la configuración
function validateEnv(): EnvConfig {
  // Verificar que existan variables críticas
  if (!process.env.JWT_SECRET) {
    throw new Error('Falta JWT_SECRET en variables de entorno');
  }

  if (!process.env.SUPABASE_URL) {
    throw new Error('Falta SUPABASE_URL en variables de entorno');
  }

  if (!process.env.SUPABASE_KEY) {
    throw new Error('Falta SUPABASE_KEY en variables de entorno');
  }

  const publicApiUrl = process.env.PUBLIC_API_URL?.trim().replace(/\/+$/, '');

  // Devolver objeto con valores (o valores por defecto)
  return {
    NODE_ENV: (process.env.NODE_ENV || 'development').trim(),
    PORT: parseInt(process.env.PORT || '3001', 10),
    MONGODB_URI: process.env.MONGODB_URI?.trim(),
    JWT_SECRET: process.env.JWT_SECRET.trim(),
    VAULT_ENCRYPTION_KEY: process.env.VAULT_ENCRYPTION_KEY?.trim() || undefined,
    FRONTEND_URL: (process.env.FRONTEND_URL || 'http://localhost:5173').trim(),
    PUBLIC_API_URL: publicApiUrl || undefined,
    REDIS_URL: process.env.REDIS_URL?.trim() || undefined,
    SUPABASE_URL: process.env.SUPABASE_URL.trim(),
    SUPABASE_KEY: process.env.SUPABASE_KEY.trim(),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined,
    DATABASE_URL: process.env.DATABASE_URL?.trim() || undefined,
    DB_PASSWORD: process.env.DB_PASSWORD?.trim() || undefined,
    AWS_REGION: (process.env.AWS_REGION || 'us-east-1').trim(),
    AWS_ACCESS_KEY_ID: stripWrappingQuotes(process.env.AWS_ACCESS_KEY_ID),
    AWS_SECRET_ACCESS_KEY: stripWrappingQuotes(process.env.AWS_SECRET_ACCESS_KEY),
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || undefined,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || undefined,
    WHATSAPP_DISPATCH_RECIPIENTS: (process.env.WHATSAPP_DISPATCH_RECIPIENTS || '').trim(),
    WHATSAPP_WEBHOOK_URL: process.env.WHATSAPP_WEBHOOK_URL?.trim() || undefined,
    OSRM_BASE_URL: (process.env.OSRM_BASE_URL || 'https://router.project-osrm.org')
      .trim()
      .replace(/\/+$/, ''),
    EXPO_PUSH_API_URL: (
      process.env.EXPO_PUSH_API_URL || 'https://exp.host/--/api/v2/push/send'
    ).trim(),
    META_GRAPH_API_BASE_URL: (
      process.env.META_GRAPH_API_BASE_URL || 'https://graph.facebook.com/v21.0'
    )
      .trim()
      .replace(/\/+$/, ''),
    DEFAULT_LAT: parseFiniteNumber(process.env.DEFAULT_LAT, 4.6097),
    DEFAULT_LNG: parseFiniteNumber(process.env.DEFAULT_LNG, -74.0817),
    REQUIRE_WS_AUTH:
      process.env.REQUIRE_WS_AUTH === 'true' ||
      (process.env.NODE_ENV || 'development').trim() === 'production',
  };
}

// Exportar configuración validada
export const env = validateEnv();