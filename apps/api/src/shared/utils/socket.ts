import { Server, Namespace } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { logger } from './logger';
import { env } from '../../config/env';
import { predictiveEngine } from '../../services/PredictiveEngine';

let io: Server | null = null;

// ─── Namespaces ──────────────────────────────────────────────────────────────
// /citizens  → Mobile app clients (emit location, trigger alarms)
// /operators → Web platform clients (receive alerts, join alert-specific rooms)
let citizensNs: Namespace | null = null;
let operatorsNs: Namespace | null = null;

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

  // ── Default namespace (legacy web compatibility) ──────────────────────────
  io.on('connection', (socket) => {
    logger.info(`🔌 Web cliente conectado: ${socket.id}`);
    socket.on('disconnect', () => {
      logger.info(`🔴 Web cliente desconectado: ${socket.id}`);
    });
  });

  // ── /citizens namespace (Mobile App) ─────────────────────────────────────
  citizensNs = io.of('/citizens');
  citizensNs.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;
    logger.info(`📱 Ciudadano conectado: ${socket.id} (userId: ${userId})`);

    // Mobile client streams its GPS location to operators watching its alert
    socket.on('user:location_update', (payload: { alertId: string; latitude: number; longitude: number }) => {
      // Broadcast only to operators who have joined the specific alert room
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
      const { userId, lat, lng } = payload;
      
      // 1. Enviar coordenadas puras a los operadores
      io!.of('/operators').emit('ghost:live_tracking', {
        userId,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });

      // 2. Motor Predictivo: Buscar cámaras en un radio de 200m
      const nearbyCameras = await predictiveEngine.getNearbyCameras(lat, lng, 200);
      
      if (nearbyCameras.length > 0) {
        io!.of('/operators').emit('ghost:nearby_cameras', {
          userId,
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

    // Operator joins a specific alert room to receive live GPS of that victim
    socket.on('watch:alert', (alertId: string) => {
      socket.join(`alert:${alertId}`);
      logger.info(`👁️ Operador ${socket.id} observando alerta: ${alertId}`);
    });

    // Operator leaves the room when done
    socket.on('unwatch:alert', (alertId: string) => {
      socket.leave(`alert:${alertId}`);
      logger.info(`🚶 Operador ${socket.id} dejó de observar: ${alertId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`🖥️ Operador desconectado: ${socket.id}`);
    });
  });

  logger.info('✅ Servidor de WebSockets (Socket.io) inicializado con namespaces /citizens y /operators');
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

