"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = __importDefault(require("http"));
const env_1 = require("./config/env");
const connection_1 = require("./infrastructure/database/connection");
const logger_1 = require("./shared/utils/logger");
const updateCameraConfig_1 = require("./jobs/updateCameraConfig");
// Importar rutas
const routes_1 = require("./modules/auth/presentation/routes");
const routes_2 = require("./modules/alerts/presentation/routes");
const routes_3 = require("./modules/cameras/presentation/routes");
const socket_1 = require("./shared/utils/socket");
const scannerRoutes_1 = require("./modules/cameras/presentation/scannerRoutes");
const routes_4 = require("./modules/analysis/presentation/routes");
const routes_5 = require("./modules/mobile/presentation/routes");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Middleware de seguridad
app.use((0, helmet_1.default)());
// Permitir conexiones (CORS)
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production' ? env_1.env.FRONTEND_URL : true, // 'true' permite cualquier origen en desarrollo
    credentials: true,
}));
// Limitar peticiones
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Demasiadas peticiones, intenta más tarde',
});
app.use('/api/', limiter);
// Permitir leer JSON en el body
app.use(express_1.default.json({ limit: '10mb' }));
// Ruta de prueba
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Servidor funcionando',
        timestamp: new Date().toISOString(),
    });
});
// REGISTRAR RUTAS
app.use('/api/auth', routes_1.authRouter);
app.use('/api/alerts', routes_2.alertRouter);
app.use('/api/cameras', routes_3.cameraRouter);
app.use('/api/cameras', scannerRoutes_1.scannerRouter);
app.use('/api/analysis', routes_4.analysisRouter);
app.use('/api/mobile', routes_5.mobileRouter);
logger_1.logger.info(`📱 Mobile API: /api/mobile (panic, location, alerts/me)`);
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
        logger_1.logger.info(`🚀 Servidor HTTP/WS activo en puerto ${PORT} (0.0.0.0)`);
        logger_1.logger.info(`📊 Health check listo: http://0.0.0.0:${PORT}/health`);
    });
    // 2. Conectar Base de Datos (en paralelo, sin bloquear el inicio)
    connection_1.dbConnection.connect(env_1.env.MONGODB_URI)
        .then(() => {
        logger_1.logger.info('✅ Mongoose: Base de datos conectada con éxito');
        // 3. Inicializar Sockets (Soporte Redis para Escalabilidad)
        return (0, socket_1.initSocket)(server);
    })
        .then(() => {
        logger_1.logger.info('✅ Socket.IO: Adaptador Redis inicializado');
        // 4. Iniciar monitoreo de cámaras
        (0, updateCameraConfig_1.startCameraMonitor)();
    })
        .catch((error) => {
        logger_1.logger.error('❌ Error en inicialización asíncrona:', error);
        // No cerramos el proceso para permitir que Cloud Run mantenga el contenedor
        // y reintente la conexión internamente si es necesario.
    });
}
// ✅ Lanzar inicio
startServer();
//# sourceMappingURL=server.js.map