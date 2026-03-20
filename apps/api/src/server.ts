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

// Limitar peticiones
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Demasiadas peticiones, intenta más tarde',
});
app.use('/api/', limiter);

// Permitir leer JSON en el body
app.use(express.json({ limit: '10mb' }));

// Ruta de prueba
app.get('/health', (req, res) => {
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
app.use((req, res) => {
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
  dbConnection.connect(env.MONGODB_URI)
    .then(() => {
      logger.info('✅ Mongoose: Base de datos conectada con éxito');
      
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
}

// ✅ Lanzar inicio
startServer();