"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const http_1 = __importDefault(require("http"));
const env_1 = require("./config/env");
const connection_1 = require("./infrastructure/database/connection");
const logger_1 = require("./shared/utils/logger");
const updateCameraConfig_1 = require("./jobs/updateCameraConfig");
const swagger_1 = require("./config/swagger");
// Importar rutas
const routes_1 = require("./modules/auth/presentation/routes");
const routes_2 = require("./modules/alerts/presentation/routes");
const routes_3 = require("./modules/cameras/presentation/routes");
const socket_1 = require("./shared/utils/socket");
const scannerRoutes_1 = require("./modules/cameras/presentation/scannerRoutes");
const routes_4 = require("./modules/analysis/presentation/routes");
const routes_5 = require("./modules/mobile/presentation/routes");
const routes_6 = require("./modules/users/presentation/routes");
const routes_7 = require("./modules/roles/presentation/routes");
const routes_8 = require("./modules/operators/presentation/routes");
const routes_9 = require("./modules/teams/presentation/routes");
const routes_10 = require("./modules/kpi/presentation/routes");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Confiar en el primer proxy inverso (AWS App Runner / Cloud Run / Nginx) para rate-limit e HTTPS
app.set('trust proxy', 1);
// Middleware de seguridad (CORP cross-origin habilitado para reproducción de evidencia acústica firmada)
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// Permitir conexiones (CORS: soporta orígenes separados por coma, móvil nativo y previsualizaciones cloud)
const allowedOrigins = env_1.env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || env_1.env.NODE_ENV !== 'production' || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        const isAllowed = allowedOrigins.includes(origin) ||
            /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
            origin.endsWith('.awsapprunner.com') ||
            origin.endsWith('.onrender.com') ||
            origin.endsWith('.railway.app') ||
            origin.endsWith('.sslip.io') ||
            origin.endsWith('.netlify.app') ||
            origin.endsWith('.vercel.app');
        callback(null, isAllowed ? true : allowedOrigins[0] || false);
    },
    credentials: true,
}));
// Limitar peticiones (Global)
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 2000, // Alto para soportar location streaming y uso normal de operadores
    message: 'Demasiadas peticiones al servidor, intenta más tarde',
});
app.use('/api/', globalLimiter);
// Límite para Autenticación y Asistente Visual de Prueba de Vida en Tiempo Real
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 300, // Soporta sondas continuas de orientación facial para adultos mayores sin bloqueo
    message: 'Demasiados intentos de autenticación, intenta en unos minutos'
});
app.use('/api/auth', authLimiter);
// Límite para el botón de pánico
const panicLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000,
    max: 5, // Evitar spam de falsas alarmas repetitivas
    message: 'Por favor, espera antes de activar otro pánico'
});
app.use('/api/mobile/panic', panicLimiter);
// Permitir leer JSON en el body (soporta expediente KYC de 3 fotografías en alta resolución)
app.use(express_1.default.json({ limit: '25mb' }));
// Rutas de salud (Raíz y /health para compatibilidad total con AWS App Runner y Cloud Run)
app.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'Red Ciudadana API',
        docs: '/api/docs',
        health: '/health',
        timestamp: new Date().toISOString(),
    });
});
app.get('/health', (_req, res) => {
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
app.use('/api/users', routes_6.usersRouter);
app.use('/api/roles', routes_7.rolesRouter);
app.use('/api/operators', routes_8.operatorsRouter);
app.use('/api/teams', routes_9.teamsRouter);
app.use('/api/kpi', routes_10.kpiRouter);
// SWAGGER DOCS
app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, {
    customSiteTitle: 'Red Ciudadana API Docs',
    customCss: '.swagger-ui .topbar { background-color: #0f172a; } .swagger-ui .topbar-wrapper img { display: none; }',
}));
app.get('/api/docs.json', (_req, res) => res.json(swagger_1.swaggerSpec));
logger_1.logger.info(`📱 Mobile API: /api/mobile (panic, location, alerts/me)`);
logger_1.logger.info(`📚 Swagger Docs: http://localhost:${env_1.env.PORT}/api/docs`);
// Ruta no encontrada
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada',
    });
});
// Iniciar servidor
function startServer() {
    const PORT = env_1.env.PORT;
    // 1. ESCUCHAR INMEDIATAMENTE (Crítico para Cloud Run Health Check)
    server.listen(PORT, '0.0.0.0', () => {
        logger_1.logger.info(`🚀 Servidor HTTP/WS activo en puerto ${PORT} (0.0.0.0)`);
        logger_1.logger.info(`📊 Health check listo: http://0.0.0.0:${PORT}/health`);
    });
    // 2. Conectar Base de Datos (en paralelo, sin bloquear el inicio)
    connection_1.dbConnection.connect()
        .then(() => {
        logger_1.logger.info('✅ PostgreSQL (Supabase): Base de datos conectada con éxito');
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