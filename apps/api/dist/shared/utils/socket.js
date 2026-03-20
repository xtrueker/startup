"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToAlertRoom = exports.emitToOperators = exports.getSocket = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const redis_1 = require("redis");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const logger_1 = require("./logger");
const env_1 = require("../../config/env");
let io = null;
// ─── Namespaces ──────────────────────────────────────────────────────────────
// /citizens  → Mobile app clients (emit location, trigger alarms)
// /operators → Web platform clients (receive alerts, join alert-specific rooms)
let citizensNs = null;
let operatorsNs = null;
const initSocket = async (server) => {
    if (io)
        return io;
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*', // Allow both web and mobile origins
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });
    // ─── Redis Adapter for National Horizontal Scaling ──────────────────────────
    if (env_1.env.REDIS_URL) {
        try {
            const pubClient = (0, redis_1.createClient)({ url: env_1.env.REDIS_URL });
            const subClient = pubClient.duplicate();
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
            logger_1.logger.info('🚀 Redis Adapter activado para escalabilidad horizontal');
        }
        catch (err) {
            logger_1.logger.error('❌ Error inicializando Redis Adapter:', err);
            logger_1.logger.warn('⚠️ Continuando sin escalabilidad horizontal (modo instancia única)');
        }
    }
    else {
        logger_1.logger.info('ℹ️ Redis no configurado. Operando en modo instancia única.');
    }
    // ── Default namespace (legacy web compatibility) ──────────────────────────
    io.on('connection', (socket) => {
        logger_1.logger.info(`🔌 Web cliente conectado: ${socket.id}`);
        socket.on('disconnect', () => {
            logger_1.logger.info(`🔴 Web cliente desconectado: ${socket.id}`);
        });
    });
    // ── /citizens namespace (Mobile App) ─────────────────────────────────────
    citizensNs = io.of('/citizens');
    citizensNs.on('connection', (socket) => {
        const userId = socket.handshake.auth?.userId;
        logger_1.logger.info(`📱 Ciudadano conectado: ${socket.id} (userId: ${userId})`);
        // Mobile client streams its GPS location to operators watching its alert
        socket.on('user:location_update', (payload) => {
            // Broadcast only to operators who have joined the specific alert room
            const { alertId, latitude, longitude } = payload;
            if (alertId && latitude && longitude) {
                io.of('/operators').to(`alert:${alertId}`).emit('user:location_update', {
                    userId,
                    alertId,
                    latitude,
                    longitude,
                    timestamp: new Date().toISOString(),
                });
            }
        });
        socket.on('disconnect', () => {
            logger_1.logger.info(`📱 Ciudadano desconectado: ${socket.id}`);
        });
    });
    // ── /operators namespace (Web Command Center) ─────────────────────────────
    operatorsNs = io.of('/operators');
    operatorsNs.on('connection', (socket) => {
        logger_1.logger.info(`🖥️ Operador conectado: ${socket.id}`);
        // Operator joins a specific alert room to receive live GPS of that victim
        socket.on('watch:alert', (alertId) => {
            socket.join(`alert:${alertId}`);
            logger_1.logger.info(`👁️ Operador ${socket.id} observando alerta: ${alertId}`);
        });
        // Operator leaves the room when done
        socket.on('unwatch:alert', (alertId) => {
            socket.leave(`alert:${alertId}`);
            logger_1.logger.info(`🚶 Operador ${socket.id} dejó de observar: ${alertId}`);
        });
        socket.on('disconnect', () => {
            logger_1.logger.info(`🖥️ Operador desconectado: ${socket.id}`);
        });
    });
    logger_1.logger.info('✅ Servidor de WebSockets (Socket.io) inicializado con namespaces /citizens y /operators');
    return io;
};
exports.initSocket = initSocket;
// ── Helpers to emit events from anywhere in the codebase ─────────────────────
/** Emit to ALL connected web clients (default namespace — legacy) */
const getSocket = () => {
    if (!io)
        throw new Error('Socket.io no ha sido inicializado. Llama a initSocket(server) primero.');
    return io;
};
exports.getSocket = getSocket;
/** Emit a new alert to ALL operators */
const emitToOperators = (event, data) => {
    if (operatorsNs)
        operatorsNs.emit(event, data);
};
exports.emitToOperators = emitToOperators;
/** Emit a targeted event inside a specific alert room */
const emitToAlertRoom = (alertId, event, data) => {
    if (operatorsNs)
        operatorsNs.to(`alert:${alertId}`).emit(event, data);
};
exports.emitToAlertRoom = emitToAlertRoom;
//# sourceMappingURL=socket.js.map