import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface AuthUserPayload {
  userId: string;
  id?: string;
  role: string;
  cedula: string;
  fullName?: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload;
}

export function verifyBearerToken(rawToken?: string | null): AuthUserPayload | null {
  if (!rawToken) return null;
  const cleanToken = rawToken.startsWith('Bearer ')
    ? rawToken.slice('Bearer '.length).trim()
    : rawToken.trim();
  if (!cleanToken) return null;

  try {
    const payload = jwt.verify(cleanToken, env.JWT_SECRET) as Record<string, any>;
    const resolvedId = payload?.userId || payload?.id;
    if (!resolvedId) return null;

    return {
      userId: String(resolvedId),
      id: String(resolvedId),
      role: String(payload?.role || 'citizen'),
      cedula: String(payload?.cedula || ''),
      fullName: payload?.fullName ? String(payload.fullName) : undefined,
      email: payload?.email ? String(payload.email) : undefined,
    };
  } catch {
    return null;
  }
}

export function extractOptionalUser(req: Request): Partial<AuthUserPayload> {
  const existing = (req as AuthRequest).user;
  if (existing?.userId || existing?.id) {
    const resolvedId = existing.userId || existing.id;
    return { ...existing, userId: resolvedId, id: resolvedId };
  }

  const verified = verifyBearerToken(req.headers.authorization);
  return verified ?? {};
}

export function getRequestUserId(req: Request): string | undefined {
  const user = extractOptionalUser(req);
  return user.userId || user.id;
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Falta token de autenticación' });
  }

  const verified = verifyBearerToken(authHeader);
  if (!verified) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }

  req.user = verified;
  next();
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para realizar esta acción' });
    }
    next();
  };
};
