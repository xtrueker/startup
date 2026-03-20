import { Router, Request, Response } from 'express';
import Alert from '../../../infrastructure/database/models/Alert';
import HistoricalIncident from '../../../infrastructure/database/models/HistoricalIncident';
import { requireAuth, requireRole } from '../../../shared/middlewares/auth';
import { calculateEscapeRoutes } from '../services/escapeRouting';
import { getSocket, emitToOperators } from '../../../shared/utils/socket';

const router = Router();

// CREAR ALERTA DE EMERGENCIA
// POST /api/alerts
router.post('/', async (req: Request, res: Response) => {
  console.log('INFO: POST /api/alerts called');
  try {
    const { userId, type, latitude, longitude, address, description, direction } = req.body;

    // Validar datos requeridos
    if (!userId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos obligatorios: userId, latitude, longitude',
      });
    }

    // Calcular rutas de escape si es un robo y hay dirección
    let escapeRoutes: any[] = [];
    if (type === 'robo' && direction) {
      escapeRoutes = await calculateEscapeRoutes(latitude, longitude, direction);
    }

    // Crear alerta
    const alert = await Alert.create({
      userId,
      type: type || 'emergency',
      status: 'active',
      location: {
        type: 'Point',
        coordinates: [longitude, latitude], // [longitud, latitud]
        address: address || '',
      },
      description: description || '',
      direction,
      escapeRoutes: escapeRoutes.length > 0 ? escapeRoutes : undefined,
    });

    const alertData = {
      id: alert._id,
      type: alert.type,
      status: alert.status,
      location: {
        latitude: alert.location.coordinates[1],
        longitude: alert.location.coordinates[0],
        address: alert.location.address,
      },
      description: alert.description,
      direction: alert.direction,
      escapeRoutes: alert.escapeRoutes,
      createdAt: alert.createdAt,
    };

    // Emitir evento WebSocket a todos los operadores conectados
    try {
      getSocket().emit('alert:new', alertData);   // legacy namespace
      emitToOperators('alert:new', alertData);    // /operators namespace
    } catch (wsError) {
      console.error('Error emitiendo WebSocket (alert:new):', wsError);
    }

    // Responder éxito
    res.status(201).json({
      success: true,
      message: 'Alerta creada exitosamente',
      data: { alert: alertData },
    });

  } catch (error: any) {
    console.error('ERROR creando alerta:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear alerta',
      error: error.message,
    });
  }
});

// OBTENER TODAS LAS ALERTAS ACTIVAS
// GET /api/alerts
router.get('/', async (req: Request, res: Response) => {
  console.log('INFO: GET /api/alerts called');
  try {
    const alerts = await Alert.find({ status: 'active' })
      .sort({ createdAt: -1 }) // Más recientes primero
      .limit(50);

    res.json({
      success: true,
      count: alerts.length,
      data: alerts.map(alert => ({
        id: alert._id,
        type: alert.type,
        status: alert.status,
        location: {
          latitude: alert.location.coordinates[1],
          longitude: alert.location.coordinates[0],
          address: alert.location.address,
        },
        description: alert.description,
        direction: alert.direction,
        escapeRoutes: alert.escapeRoutes,
        createdAt: alert.createdAt,
      })),
    });

  } catch (error: any) {
    console.error('ERROR obteniendo alertas:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener alertas',
      error: error.message
    });
  }
});

// ELIMINAR/RESOLVER ALERTA
// DELETE /api/alerts/:id
router.delete('/:id', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (req: Request, res: Response) => {
  console.log(`INFO: DELETE /api/alerts/${req.params.id} called`);
  try {
    const { id } = req.params;
    
    // Buscar la alerta original
    const alert = await Alert.findById(id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerta no encontrada',
      });
    }

    // Mover a incidente histórico
    await HistoricalIncident.create({
      originalAlertId: alert._id,
      type: alert.type,
      location: alert.location,
      reportedAt: alert.createdAt,
      resolvedAt: new Date(),
    });

    // Eliminar alerta activa
    await Alert.findByIdAndDelete(id);

    // Emitir evento WebSocket a todos los operadores conectados
    try {
      getSocket().emit('alert:deleted', { id });   // legacy
      emitToOperators('alert:deleted', { id });    // /operators namespace
    } catch (wsError) {
      console.error('Error emitiendo WebSocket (alert:deleted):', wsError);
    }

    res.json({
      success: true,
      message: 'Alerta resuelta y archivada históricamente',
    });

  } catch (error: any) {
    console.error('ERROR eliminando alerta:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar la alerta',
      error: error.message,
    });
  }
});

export { router as alertRouter };