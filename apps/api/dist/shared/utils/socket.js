"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchTacticalAlert = exports.emitToAlertRoom = exports.emitToOperatorsAndRoot = exports.emitToOperators = exports.getSocket = exports.initSocket = exports.getActivePatrolUnits = void 0;
const socket_io_1 = require("socket.io");
const redis_1 = require("redis");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const logger_1 = require("./logger");
const url_1 = require("./url");
const env_1 = require("../../config/env");
const system_1 = require("../constants/system");
const auth_1 = require("../middlewares/auth");
const User_1 = __importDefault(require("../../infrastructure/database/models/User"));
const PredictiveEngine_1 = require("../../services/PredictiveEngine");
const PushDispatchService_1 = require("../services/PushDispatchService");
const EvidenceStorageService_1 = require("../../modules/mobile/services/EvidenceStorageService");
let io = null;
// ─── Namespaces ──────────────────────────────────────────────────────────────
// /citizens  → Mobile app clients (emit location, trigger alarms)
// /operators → Web platform clients (receive alerts, join alert-specific rooms)
let citizensNs = null;
let operatorsNs = null;
// In-memory registry of active police patrol units
const activePatrolUnits = new Map();
const getActivePatrolUnits = () => {
    return Array.from(activePatrolUnits.values());
};
exports.getActivePatrolUnits = getActivePatrolUnits;
/**
 * Helper to extract user from socket token
 */
function extractUserFromSocket(socket) {
    const rawToken = socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;
    return (0, auth_1.verifyBearerToken)(rawToken);
}
/**
 * Configure police patrol listeners for any socket connection (default or /citizens)
 */
function setupPatrolListeners(socket, user) {
    const officerId = user?.userId || user?.id || socket.id;
    const officerName = user?.fullName || user?.email || 'Unidad Policial';
    const cedula = user?.cedula || '';
    const isPolice = user?.role === 'police';
    if (isPolice) {
        socket.join('police');
        socket.join(`officer:${officerId}`);
        logger_1.logger.info(`🚔 Oficial de Policía conectado [${socket.id}]: ${officerName}${cedula ? ` (Cédula: ${cedula})` : ''}`);
    }
    // 1. Inicio de Patrulla
    socket.on('patrol:start', (data) => {
        logger_1.logger.info(`🚔 [Patrulla Iniciada] ${officerName} (${officerId})`);
        socket.join('police');
        socket.join(`officer:${officerId}`);
        const parsedLat = Number(data?.latitude);
        const parsedLng = Number(data?.longitude);
        const initialLat = Number.isFinite(parsedLat) ? parsedLat : env_1.env.DEFAULT_LAT;
        const initialLng = Number.isFinite(parsedLng) ? parsedLng : env_1.env.DEFAULT_LNG;
        const unitInfo = {
            socketId: socket.id,
            officerId,
            officerName,
            cedula,
            role: 'police',
            lat: initialLat,
            lng: initialLng,
            latitude: initialLat,
            longitude: initialLng,
            speed: 0,
            heading: 0,
            accuracy: 5,
            status: 'available',
            lastUpdate: data?.timestamp || new Date().toISOString(),
        };
        activePatrolUnits.set(socket.id, unitInfo);
        (0, exports.emitToOperators)('police:unit_online', unitInfo);
        (0, exports.emitToOperatorsAndRoot)('police:unit_moved', unitInfo);
    });
    // 2. Transmisión GPS en Vivo (Streaming continuo)
    socket.on('patrol:location', (payload) => {
        const unitUpdate = {
            socketId: socket.id,
            officerId,
            officerName,
            cedula,
            role: 'police',
            lat: payload.latitude,
            lng: payload.longitude,
            latitude: payload.latitude,
            longitude: payload.longitude,
            speed: payload.speed,
            heading: payload.heading,
            accuracy: payload.accuracy,
            status: payload.status || 'available',
            lastUpdate: payload.timestamp || new Date().toISOString(),
        };
        activePatrolUnits.set(socket.id, unitUpdate);
        // 📡 RETRANSMISIÓN AL CENTRO DE MANDO WEB mediante 'police:unit_moved'
        (0, exports.emitToOperatorsAndRoot)('police:unit_moved', unitUpdate);
    });
    // 3. Heartbeat cada 30 segundos
    socket.on('patrol:heartbeat', (payload) => {
        const existing = activePatrolUnits.get(socket.id);
        if (existing) {
            existing.status = payload?.status || existing.status;
            existing.lastUpdate = payload?.timestamp || new Date().toISOString();
        }
        (0, exports.emitToOperators)('police:unit_heartbeat', {
            officerId,
            status: payload?.status,
            timestamp: payload?.timestamp || new Date().toISOString(),
        });
    });
    // 4. Cambio de Estado Operativo
    socket.on('patrol:status_change', (payload) => {
        logger_1.logger.info(`🚔 Cambio de estado patrulla [${officerName}]: ${payload.status}`);
        const existing = activePatrolUnits.get(socket.id);
        if (existing) {
            existing.status = payload.status;
            existing.lastUpdate = payload.timestamp || new Date().toISOString();
        }
        (0, exports.emitToOperatorsAndRoot)('police:unit_status_changed', {
            officerId,
            status: payload.status,
            timestamp: payload.timestamp || new Date().toISOString(),
        });
    });
    // 5. Fin de Patrulla
    socket.on('patrol:end', () => {
        logger_1.logger.info(`🚔 Fin de patrulla: ${officerName}`);
        activePatrolUnits.delete(socket.id);
        (0, exports.emitToOperatorsAndRoot)('police:unit_offline', { officerId, timestamp: new Date().toISOString() });
    });
    // 6. Desconexión
    socket.on('disconnect', () => {
        if (activePatrolUnits.has(socket.id)) {
            activePatrolUnits.delete(socket.id);
            (0, exports.emitToOperatorsAndRoot)('police:unit_offline', { officerId, timestamp: new Date().toISOString() });
        }
    });
}
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
            logger_1.logger.error(err, '❌ Error inicializando Redis Adapter:');
            logger_1.logger.warn('⚠️ Continuando sin escalabilidad horizontal (modo instancia única)');
        }
    }
    else {
        logger_1.logger.info('ℹ️ Redis no configurado. Operando en modo instancia única.');
    }
    // ── Default namespace (Root: Web + Mobile) ──────────────────────────────────
    io.on('connection', (socket) => {
        const user = extractUserFromSocket(socket);
        logger_1.logger.info(`🔌 Cliente conectado [${socket.id}]${user ? ` (Usuario: ${user.fullName || user.email}, Rol: ${user.role})` : ''}`);
        // Configurar listeners de patrulla policial
        setupPatrolListeners(socket, user);
        // Operator dispatches alert to police
        socket.on('patrol:dispatch', (data) => {
            if (!user || !system_1.COMMAND_CENTER_ROLES.includes(user.role)) {
                logger_1.logger.warn({ socketId: socket.id }, '⚠️ Intento no autorizado de patrol:dispatch en namespace raíz');
                return;
            }
            (0, exports.dispatchTacticalAlert)(data);
        });
        socket.on('patrol:get_active_units', (callback) => {
            if (typeof callback === 'function') {
                callback((0, exports.getActivePatrolUnits)());
            }
        });
        socket.on('disconnect', () => {
            logger_1.logger.info(`🔴 Cliente desconectado: ${socket.id}`);
        });
    });
    // ── /citizens namespace (Mobile App) ─────────────────────────────────────
    citizensNs = io.of('/citizens');
    citizensNs.on('connection', (socket) => {
        const user = extractUserFromSocket(socket);
        const userId = user?.userId || socket.handshake.auth?.userId;
        logger_1.logger.info(`📱 Ciudadano conectado: ${socket.id} (userId: ${userId})`);
        setupPatrolListeners(socket, user);
        // Mobile client streams its GPS location to operators watching its alert
        socket.on('user:location_update', (payload) => {
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
        // ─── PROTOCOLO MODO FANTASMA ──────────────────────────────────────────────
        socket.on('ghost:location_update', async (payload) => {
            const { userId: ghostUserId, lat, lng } = payload;
            io.of('/operators').emit('ghost:live_tracking', {
                userId: ghostUserId,
                lat,
                lng,
                timestamp: new Date().toISOString(),
            });
            const nearbyCameras = await PredictiveEngine_1.predictiveEngine.getNearbyCameras(lat, lng, 200);
            if (nearbyCameras.length > 0) {
                io.of('/operators').emit('ghost:nearby_cameras', {
                    userId: ghostUserId,
                    cameras: nearbyCameras
                });
            }
        });
        socket.on('disconnect', () => {
            logger_1.logger.info(`📱 Ciudadano desconectado: ${socket.id}`);
        });
    });
    // ── /operators namespace (Web Command Center) ─────────────────────────────
    operatorsNs = io.of('/operators');
    // Guard de autenticación en handshake para impedir acceso anónimo a telemetría policial y audios firmados
    operatorsNs.use(async (socket, next) => {
        const jwtUser = extractUserFromSocket(socket);
        if (jwtUser && system_1.COMMAND_CENTER_ROLES.includes(jwtUser.role)) {
            socket.data.operatorUser = jwtUser;
            return next();
        }
        // Compatibilidad controlada solo en desarrollo local cuando la consola web envía userId sin token
        if (!env_1.env.REQUIRE_WS_AUTH) {
            const candidateUserId = String(socket.handshake.auth?.userId || '').trim();
            if (system_1.UUID_REGEX.test(candidateUserId)) {
                try {
                    const dbUser = await User_1.default.findById(candidateUserId);
                    if (dbUser && system_1.COMMAND_CENTER_ROLES.includes(dbUser.role)) {
                        socket.data.operatorUser = {
                            userId: dbUser.id,
                            id: dbUser.id,
                            role: dbUser.role,
                            cedula: dbUser.cedula || '',
                            fullName: dbUser.full_name,
                            email: dbUser.email,
                        };
                        return next();
                    }
                }
                catch (err) {
                    logger_1.logger.warn({ err }, 'Error verificando identidad de operador en handshake WS');
                }
            }
        }
        logger_1.logger.warn({ socketId: socket.id, ip: socket.handshake.address }, '🚫 Conexión rechazada en /operators: credenciales ausentes o sin rol de Centro de Mando');
        return next(new Error('No autorizado para conectar al canal de operadores'));
    });
    operatorsNs.on('connection', (socket) => {
        const connectedOperator = socket.data.operatorUser;
        logger_1.logger.info(`🖥️ Operador autenticado conectado: ${socket.id} (${connectedOperator?.fullName || connectedOperator?.userId || 'operador'})`);
        // Enviar inmediatamente las unidades policiales activas al operador
        socket.emit('police:active_units', (0, exports.getActivePatrolUnits)());
        // Hidratar al Centro de Mando con los fragmentos de audio cifrados ya guardados en Supabase
        const resolveSocketApiBaseUrl = () => (0, url_1.resolveHeadersBaseUrl)(socket.handshake.headers);
        const hydrateTimer = setTimeout(async () => {
            if (!socket.connected)
                return;
            try {
                const bundles = await EvidenceStorageService_1.EvidenceStorageService.listEvidenceVault({
                    userId: connectedOperator?.userId || 'operator_console',
                    role: connectedOperator?.role || 'operator',
                    apiBaseUrl: resolveSocketApiBaseUrl(),
                    limit: 15,
                });
                for (const bundle of bundles) {
                    if (bundle.status === 'resolved' || bundle.status === 'discarded')
                        continue;
                    for (const clip of bundle.clips) {
                        socket.emit('evidence:audio_chunk', {
                            alertId: bundle.alertId,
                            url: clip.url,
                            chunkIndex: clip.chunkIndex,
                            durationMs: clip.durationMs,
                            sha256Hash: clip.sha256Hash,
                        });
                    }
                }
            }
            catch (err) {
                logger_1.logger.warn({ err }, 'No se pudo hidratar cola inicial de audio para operador');
            }
        }, 650);
        // Operator joins a specific alert room to receive live GPS of that victim
        socket.on('watch:alert', async (alertId) => {
            if (!system_1.UUID_REGEX.test(String(alertId || '')))
                return;
            socket.join(`alert:${alertId}`);
            logger_1.logger.info(`👁️ Operador ${socket.id} observando alerta: ${alertId}`);
            try {
                const clips = await EvidenceStorageService_1.EvidenceStorageService.listAlertEvidence(alertId, resolveSocketApiBaseUrl());
                socket.emit('evidence:history', { alertId, clips });
            }
            catch { }
        });
        socket.on('unwatch:alert', (alertId) => {
            socket.leave(`alert:${alertId}`);
            logger_1.logger.info(`🚶 Operador ${socket.id} dejó de observar: ${alertId}`);
        });
        // Despacho táctico emitido desde la consola web (exige identidad verificada de operador)
        socket.on('patrol:dispatch', (data) => {
            const opUser = socket.data.operatorUser ||
                extractUserFromSocket(socket);
            if (!opUser || !system_1.COMMAND_CENTER_ROLES.includes(opUser.role)) {
                logger_1.logger.warn({ socketId: socket.id, role: opUser?.role }, '⚠️ Intento no autorizado de patrol:dispatch bloqueado en /operators');
                return;
            }
            (0, exports.dispatchTacticalAlert)(data);
        });
        socket.on('disconnect', () => {
            clearTimeout(hydrateTimer);
            logger_1.logger.info(`🖥️ Operador desconectado: ${socket.id}`);
        });
    });
    logger_1.logger.info('✅ Servidor de WebSockets (Socket.io) inicializado con namespaces /citizens y /operators + Terminal Policial');
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
/** Emit safely to both default namespace and /operators namespace */
const emitToOperatorsAndRoot = (event, data) => {
    try {
        if (io)
            io.emit(event, data);
        if (operatorsNs)
            operatorsNs.emit(event, data);
    }
    catch (wsError) {
        logger_1.logger.warn({ err: wsError, event }, 'Error emitiendo evento WebSocket');
    }
};
exports.emitToOperatorsAndRoot = emitToOperatorsAndRoot;
/** Emit a targeted event inside a specific alert room */
const emitToAlertRoom = (alertId, event, data) => {
    if (operatorsNs)
        operatorsNs.to(`alert:${alertId}`).emit(event, data);
};
exports.emitToAlertRoom = emitToAlertRoom;
/**
 * 🚨 DESPACHO TÁCTICO: Emitir alerta de emergencia directa a patrullas policiales
 */
const dispatchTacticalAlert = (data) => {
    const latitude = Number(data?.latitude);
    const longitude = Number(data?.longitude);
    if (!data?.alertId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        logger_1.logger.warn({ alertId: data?.alertId, latitude: data?.latitude, longitude: data?.longitude }, '⚠️ Despacho táctico omitido: coordenadas GPS ausentes o no finitas');
        return;
    }
    const dispatchPayload = {
        alertId: data.alertId,
        citizenName: data.citizenName || 'Ciudadano en Riesgo',
        emergencyType: data.emergencyType || 'emergency',
        latitude,
        longitude,
        address: data.address || 'Ubicación referenciada en mapa táctico',
        dispatchedAt: new Date().toISOString(),
        notes: data.notes || '🚨 Despacho prioritario del Centro de Mando',
    };
    logger_1.logger.info(`🚨 [DESPACHO TÁCTICO] Emitiendo alerta ${data.alertId} a la fuerza policial`);
    if (io) {
        if (data.officerId) {
            io.to(`officer:${data.officerId}`).emit('patrol:dispatch', dispatchPayload);
            citizensNs?.to(`officer:${data.officerId}`).emit('patrol:dispatch', dispatchPayload);
        }
        // Emitir a la sala general de policías
        io.to('police').emit('patrol:dispatch', dispatchPayload);
        citizensNs?.to('police').emit('patrol:dispatch', dispatchPayload);
        // Broadcast global por resiliencia
        io.emit('patrol:dispatch', dispatchPayload);
    }
    // Notificar también a los operadores web que el despacho fue emitido
    (0, exports.emitToOperators)('patrol:dispatch_sent', dispatchPayload);
    // Despertar terminales móviles con pantalla bloqueada mediante Push de alta prioridad
    PushDispatchService_1.PushDispatchService.notifyOfficerDispatch(data.officerId, {
        alertId: data.alertId,
        title: 'Despacho Inmediato — Red Ciudadana',
        body: `${dispatchPayload.citizenName} · ${dispatchPayload.address}`,
        data: dispatchPayload,
    }).catch(() => { });
};
exports.dispatchTacticalAlert = dispatchTacticalAlert;
//# sourceMappingURL=socket.js.map