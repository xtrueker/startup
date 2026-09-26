import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import http from 'http';
import { env } from './config/env';
import { dbConnection } from './infrastructure/database/connection';
import { logger } from './shared/utils/logger';
import { startCameraMonitor } from './jobs/updateCameraConfig';

// Importar rutas
import { authRouter } from './modules/auth/presentation/routes';
import { alertRouter } from './modules/alerts/presentation/routes';
import { cameraRouter } from './modules/cameras/presentation/routes';
import { initSocket } from './shared/utils/socket';
import { scannerRouter } from './modules/cameras/presentation/scannerRoutes';
import { analysisRouter } from './modules/analysis/presentation/routes';
import { mobileRouter } from './modules/mobile/presentation/routes';

const app = express();
const server = http.createServer(app);

// Middleware de seguridad
app.use(helmet());

// Permitir conexiones (CORS)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? env.FRONTEND_URL : true, // 'true' permite cualquier origen en desarrollo
  credentials: true,
}));

// Limitar peticiones (Global)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Alto para soportar location streaming y uso normal de operadores
  message: 'Demasiadas peticiones al servidor, intenta más tarde',
});
app.use('/api/', globalLimiter);

// Límite estricto para Autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Prevenir fuerza bruta
  message: 'Demasiados intentos de inicio de sesión, intenta en 15 minutos'
});
app.use('/api/auth', authLimiter);

// Límite para el botón de pánico
const panicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5, // Evitar spam de falsas alarmas repetitivas
  message: 'Por favor, espera antes de activar otro pánico'
});
app.use('/api/mobile/panic', panicLimiter);

// Permitir leer JSON en el body
app.use(express.json({ limit: '10mb' }));

// Ruta de prueba
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString(),
  });
});

// REGISTRAR RUTAS
app.use('/api/auth', authRouter);
app.use('/api/alerts', alertRouter);
app.use('/api/cameras', cameraRouter);
app.use('/api/cameras', scannerRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/mobile', mobileRouter);

logger.info(`📱 Mobile API: /api/mobile (panic, location, alerts/me)`);

// Ruta no encontrada
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
  });
});

// Iniciar servidor
function startServer() {
  const PORT = Number(process.env.PORT) || 3001;

  // 1. ESCUCHAR INMEDIATAMENTE (Crítico para Cloud Run Health Check)
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Servidor HTTP/WS activo en puerto ${PORT} (0.0.0.0)`);
    logger.info(`📊 Health check listo: http://0.0.0.0:${PORT}/health`);
  });

  // 2. Conectar Base de Datos (en paralelo, sin bloquear el inicio)
  dbConnection.connect()
    .then(() => {
      logger.info('✅ PostgreSQL (Supabase): Base de datos conectada con éxito');
      
      // 3. Inicializar Sockets (Soporte Redis para Escalabilidad)
      return initSocket(server);
    })
    .then(() => {
      logger.info('✅ Socket.IO: Adaptador Redis inicializado');
      
      // 4. Iniciar monitoreo de cámaras
      startCameraMonitor();
    })
    .catch((error) => {
      logger.error('❌ Error en inicialización asíncrona:', error);
      // No cerramos el proceso para permitir que Cloud Run mantenga el contenedor
      // y reintente la conexión internamente si es necesario.
    });

  // --- MOCK SIMULADOR DE ALERTAS ---
  const { emitToOperators } = require('./shared/utils/socket');
  
  const dispararAlertasSimuladas = () => {
    logger.info('🎯 Disparando 3 Alertas de Pánico Simuladas con Cámaras Cercanas...');
    for (let i = 0; i < 3; i++) {
      const alertLat = 4.6097 + (Math.random() - 0.5) * 0.05;
      const alertLng = -74.0817 + (Math.random() - 0.5) * 0.05;
      
      const mockAlert = {
        id: `mock-alert-${Date.now()}-${i}`,
        createdAt: new Date().toISOString(),
        location: {
          latitude: alertLat,
          longitude: alertLng,
          address: `Simulación Barrio ${Math.floor(Math.random() * 100)}`
        },
        status: 'pending',
        userId: 'citizen_simulated',
        type: Math.random() > 0.5 ? 'Robo a Mano Armada (Simulado)' : 'Pánico Disparado (Simulado)'
      };
      
      emitToOperators('alert:new', mockAlert);

      // Inyectar 2 cámaras en un radio menor a 50 metros (~0.00045 grados)
      for (let j = 0; j < 2; j++) {
        const camLat = alertLat + (Math.random() - 0.5) * 0.0008; // ~44 metros máx varianza
        const camLng = alertLng + (Math.random() - 0.5) * 0.0008;
        
        const mockCam = {
          id: `mock-cam-${Date.now()}-${i}-${j}`,
          name: `Cámara Táctica C${i}${j}`,
          location: {
            latitude: camLat,
            longitude: camLng,
            address: `Poste Intersección ${j}`
          },
          streamUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
          status: 'active'
        };
        emitToOperators('camera:new', mockCam);
      }
    }
  };

  // Disparar la primera vez a los 10 segundos para dar tiempo a que los clientes se conecten
  setTimeout(() => {
    dispararAlertasSimuladas();
    // Luego cada minuto
    setInterval(dispararAlertasSimuladas, 60000);
  }, 10000);
  // ---------------------------------
}

// ✅ Lanzar inicio
startServer();