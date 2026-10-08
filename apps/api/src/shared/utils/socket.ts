import { Server, Namespace, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { logger } from './logger';
import { env } from '../../config/env';
import { predictiveEngine } from '../../services/PredictiveEngine';

let io: Server | null = null;

// ─── Namespaces ──────────────────────────────────────────────────────────────
// /citizens  → Mobile app clients (emit location, trigger alarms)
// /operators → Web platform clients (receive alerts, join alert-specific rooms)
let citizensNs: Namespace | null = null;
let operatorsNs: Namespace | null = null;

export interface PatrolUnitInfo {
  socketId: string;
  officerId: string;
  officerName?: string;
  cedula?: string;
  role?: string;
  lat: number;
  lng: number;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  status: 'off_duty' | 'available' | 'responding' | 'busy';
  lastUpdate: string;
}

// In-memory registry of active police patrol units
const activePatrolUnits = new Map<string, PatrolUnitInfo>();

export const getActivePatrolUnits = (): PatrolUnitInfo[] => {
  return Array.from(activePatrolUnits.values());
};

/**
 * Helper to extract user from socket token
 */
function extractUserFromSocket(socket: Socket): any | null {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, env.JWT_SECRET) as any;
  } catch {
    return null;
  }
}

/**
 * Configure police patrol listeners for any socket connection (default or /citizens)
 */
function setupPatrolListeners(socket: Socket, user: any | null) {
  const officerId = user?.userId || user?.id || socket.id;
  const officerName = user?.fullName || 'Patrullero Pérez - Cuadrante 04';
  const cedula = user?.cedula || '1098765432';
  const isPolice = user?.role === 'police';

  if (isPolice) {
    socket.join('police');
    socket.join(`officer:${officerId}`);
    logger.info(`🚔 Oficial de Policía conectado [${socket.id}]: ${officerName} (Cédula: ${cedula})`);
  }

  // 1. Inicio de Patrulla
  socket.on('patrol:start', (data: any) => {
    logger.info(`🚔 [Patrulla Iniciada] ${officerName} (${officerId})`);
    socket.join('police');
    socket.join(`officer:${officerId}`);

    const unitInfo: PatrolUnitInfo = {
      socketId: socket.id,
      officerId,
      officerName,
      cedula,
      role: 'police',
      lat: data?.latitude || 4.6097,
      lng: data?.longitude || -74.0817,
      latitude: data?.latitude || 4.6097,
      longitude: data?.longitude || -74.0817,
      speed: 0,
      heading: 0,
      accuracy: 5,
      status: 'available',
      lastUpdate: data?.timestamp || new Date().toISOString(),
    };
    activePatrolUnits.set(socket.id, unitInfo);

    emitToOperators('police:unit_online', unitInfo);
    emitToOperators('police:unit_moved', unitInfo);
    io?.emit('police:unit_moved', unitInfo);
  });

  // 2. Transmisión GPS en Vivo (Streaming continuo)
  socket.on('patrol:location', (payload: {
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    accuracy: number | null;
    status: 'off_duty' | 'available' | 'responding' | 'busy';
    timestamp: string;
  }) => {
    const unitUpdate: PatrolUnitInfo = {
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
    emitToOperators('police:unit_moved', unitUpdate);
    io?.emit('police:unit_moved', unitUpdate);
  });

  // 3. Heartbeat cada 30 segundos
  socket.on('patrol:heartbeat', (payload: { status: string; timestamp: string }) => {
    const existing = activePatrolUnits.get(socket.id);
    if (existing) {
      existing.status = (payload?.status as any) || existing.status;
      existing.lastUpdate = payload?.timestamp || new Date().toISOString();
    }
    emitToOperators('police:unit_heartbeat', {
      officerId,
      status: payload?.status,
      timestamp: payload?.timestamp || new Date().toISOString(),
    });
  });

  // 4. Cambio de Estado Operativo
  socket.on('patrol:status_change', (payload: { status: any; timestamp: string }) => {
    logger.info(`🚔 Cambio de estado patrulla [${officerName}]: ${payload.status}`);
    const existing = activePatrolUnits.get(socket.id);
    if (existing) {
      existing.status = payload.status;
      existing.lastUpdate = payload.timestamp || new Date().toISOString();
    }
    emitToOperators('police:unit_status_changed', {
      officerId,
      status: payload.status,
      timestamp: payload.timestamp || new Date().toISOString(),
    });
    io?.emit('police:unit_status_changed', {
      officerId,
      status: payload.status,
      timestamp: payload.timestamp || new Date().toISOString(),
    });
  });

  // 5. Fin de Patrulla
  socket.on('patrol:end', () => {
    logger.info(`🚔 Fin de patrulla: ${officerName}`);
    activePatrolUnits.delete(socket.id);
    emitToOperators('police:unit_offline', { officerId, timestamp: new Date().toISOString() });
    io?.emit('police:unit_offline', { officerId, timestamp: new Date().toISOString() });
  });

  // 6. Desconexión
  socket.on('disconnect', () => {
    if (activePatrolUnits.has(socket.id)) {
      activePatrolUnits.delete(socket.id);
      emitToOperators('police:unit_offline', { officerId, timestamp: new Date().toISOString() });
      io?.emit('police:unit_offline', { officerId, timestamp: new Date().toISOString() });
    }
  });
}

export const initSocket = async (server: HttpServer) => {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: '*', // Allow both web and mobile origins
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ─── Redis Adapter for National Horizontal Scaling ──────────────────────────
  if (env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: env.REDIS_URL });
      const subClient = pubClient.duplicate();
      
      await Promise.all([pubClient.connect(), subClient.connect()]);
      
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('🚀 Redis Adapter activado para escalabilidad horizontal');
    } catch (err) {
      logger.error(err, '❌ Error inicializando Redis Adapter:');
      logger.warn('⚠️ Continuando sin escalabilidad horizontal (modo instancia única)');
    }
  } else {
    logger.info('ℹ️ Redis no configurado. Operando en modo instancia única.');
  }

  // ── Default namespace (Root: Web + Mobile) ──────────────────────────────────
  io.on('connection', (socket) => {
    const user = extractUserFromSocket(socket);
    logger.info(`🔌 Cliente conectado [${socket.id}]${user ? ` (Usuario: ${user.fullName || user.email}, Rol: ${user.role})` : ''}`);

    // Configurar listeners de patrulla policial
    setupPatrolListeners(socket, user);

    // Operator dispatches alert to police
    socket.on('patrol:dispatch', (data: any) => {
      dispatchTacticalAlert(data);
    });

    socket.on('patrol:get_active_units', (callback: (units: PatrolUnitInfo[]) => void) => {
      if (typeof callback === 'function') {
        callback(getActivePatrolUnits());
      }
    });

    socket.on('disconnect', () => {
      logger.info(`🔴 Cliente desconectado: ${socket.id}`);
    });
  });

  // ── /citizens namespace (Mobile App) ─────────────────────────────────────
  citizensNs = io.of('/citizens');
  citizensNs.on('connection', (socket) => {
    const user = extractUserFromSocket(socket);
    const userId = user?.userId || socket.handshake.auth?.userId;
    logger.info(`📱 Ciudadano conectado: ${socket.id} (userId: ${userId})`);

    setupPatrolListeners(socket, user);

    // Mobile client streams its GPS location to operators watching its alert
    socket.on('user:location_update', (payload: { alertId: string; latitude: number; longitude: number }) => {
      const { alertId, latitude, longitude } = payload;
      if (alertId && latitude && longitude) {
        io!.of('/operators').to(`alert:${alertId}`).emit('user:location_update', {
          userId,
          alertId,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ─── PROTOCOLO MODO FANTASMA ──────────────────────────────────────────────
    socket.on('ghost:location_update', async (payload: { userId: string; lat: number; lng: number }) => {
      const { userId: ghostUserId, lat, lng } = payload;
      
      io!.of('/operators').emit('ghost:live_tracking', {
        userId: ghostUserId,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });

      const nearbyCameras = await predictiveEngine.getNearbyCameras(lat, lng, 200);
      if (nearbyCameras.length > 0) {
        io!.of('/operators').emit('ghost:nearby_cameras', {
          userId: ghostUserId,
          cameras: nearbyCameras
        });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`📱 Ciudadano desconectado: ${socket.id}`);
    });
  });

  // ── /operators namespace (Web Command Center) ─────────────────────────────
  operatorsNs = io.of('/operators');
  operatorsNs.on('connection', (socket) => {
    logger.info(`🖥️ Operador conectado: ${socket.id}`);

    // Enviar inmediatamente las unidades policiales activas al operador
    socket.emit('police:active_units', getActivePatrolUnits());

    // Operator joins a specific alert room to receive live GPS of that victim
    socket.on('watch:alert', (alertId: string) => {
      socket.join(`alert:${alertId}`);
      logger.info(`👁️ Operador ${socket.id} observando alerta: ${alertId}`);
    });

    socket.on('unwatch:alert', (alertId: string) => {
      socket.leave(`alert:${alertId}`);
      logger.info(`🚶 Operador ${socket.id} dejó de observar: ${alertId}`);
    });

    // Despacho táctico emitido desde la consola web
    socket.on('patrol:dispatch', (data: any) => {
      dispatchTacticalAlert(data);
    });

    socket.on('disconnect', () => {
      logger.info(`🖥️ Operador desconectado: ${socket.id}`);
    });
  });

  logger.info('✅ Servidor de WebSockets (Socket.io) inicializado con namespaces /citizens y /operators + Terminal Policial');
  return io;
};

// ── Helpers to emit events from anywhere in the codebase ─────────────────────

/** Emit to ALL connected web clients (default namespace — legacy) */
export const getSocket = (): Server => {
  if (!io) throw new Error('Socket.io no ha sido inicializado. Llama a initSocket(server) primero.');
  return io;
};

/** Emit a new alert to ALL operators */
export const emitToOperators = (event: string, data: unknown) => {
  if (operatorsNs) operatorsNs.emit(event, data);
};

/** Emit a targeted event inside a specific alert room */
export const emitToAlertRoom = (alertId: string, event: string, data: unknown) => {
  if (operatorsNs) operatorsNs.to(`alert:${alertId}`).emit(event, data);
};

/**
 * 🚨 DESPACHO TÁCTICO: Emitir alerta de emergencia directa a patrullas policiales
 */
export const dispatchTacticalAlert = (data: {
  alertId: string;
  citizenName?: string;
  emergencyType?: string;
  latitude: number;
  longitude: number;
  address?: string;
  officerId?: string;
  notes?: string;
}) => {
  const dispatchPayload = {
    alertId: data.alertId,
    citizenName: data.citizenName || 'Ciudadano en Riesgo',
    emergencyType: data.emergencyType || 'emergency',
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address || 'Ubicación referenciada en mapa táctico',
    dispatchedAt: new Date().toISOString(),
    notes: data.notes || '🚨 Despacho prioritario del Centro de Mando',
  };

  logger.info(`🚨 [DESPACHO TÁCTICO] Emitiendo alerta ${data.alertId} a la fuerza policial`);

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
  emitToOperators('patrol:dispatch_sent', dispatchPayload);
};
