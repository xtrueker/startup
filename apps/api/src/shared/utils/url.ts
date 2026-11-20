import { Request } from 'express';
import { IncomingHttpHeaders } from 'http';
import { env } from '../../config/env';

/**
 * Resuelve la URL pública base del API a partir de PUBLIC_API_URL o cabeceras proxy inverso.
 * Unifica la resolución usada en endpoints REST y conexiones WebSocket.
 */
export function resolveHeadersBaseUrl(
  headers: IncomingHttpHeaders,
  fallbackProtocol = 'http'
): string {
  if (env.PUBLIC_API_URL) {
    return env.PUBLIC_API_URL;
  }

  const forwardedProto = headers['x-forwarded-proto'];
  const rawProto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto || fallbackProtocol;
  const proto = String(rawProto).split(',')[0].trim() || fallbackProtocol;
  const host = headers.host || `localhost:${env.PORT}`;

  return `${proto}://${host}`;
}

export function resolveRequestBaseUrl(req: Request): string {
  return resolveHeadersBaseUrl(req.headers, req.protocol || 'http');
}

export function buildCitizenTrackingUrl(alertId: string): string {
  const primaryFrontend = env.FRONTEND_URL.split(',')[0]?.trim() || 'http://localhost:5173';
  const cleanBase = primaryFrontend.replace(/\/+$/, '');
  return `${cleanBase}/citizen-tracker?alertId=${encodeURIComponent(alertId)}`;
}
