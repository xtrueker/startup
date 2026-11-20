"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = void 0;
exports.verifyBearerToken = verifyBearerToken;
exports.extractOptionalUser = extractOptionalUser;
exports.getRequestUserId = getRequestUserId;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
function verifyBearerToken(rawToken) {
    if (!rawToken)
        return null;
    const cleanToken = rawToken.startsWith('Bearer ')
        ? rawToken.slice('Bearer '.length).trim()
        : rawToken.trim();
    if (!cleanToken)
        return null;
    try {
        const payload = jsonwebtoken_1.default.verify(cleanToken, env_1.env.JWT_SECRET);
        const resolvedId = payload?.userId || payload?.id;
        if (!resolvedId)
            return null;
        return {
            userId: String(resolvedId),
            id: String(resolvedId),
            role: String(payload?.role || 'citizen'),
            cedula: String(payload?.cedula || ''),
            fullName: payload?.fullName ? String(payload.fullName) : undefined,
            email: payload?.email ? String(payload.email) : undefined,
        };
    }
    catch {
        return null;
    }
}
function extractOptionalUser(req) {
    const existing = req.user;
    if (existing?.userId || existing?.id) {
        const resolvedId = existing.userId || existing.id;
        return { ...existing, userId: resolvedId, id: resolvedId };
    }
    const verified = verifyBearerToken(req.headers.authorization);
    return verified ?? {};
}
function getRequestUserId(req) {
    const user = extractOptionalUser(req);
    return user.userId || user.id;
}
const requireAuth = (req, res, next) => {
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
exports.requireAuth = requireAuth;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para realizar esta acción' });
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.js.map