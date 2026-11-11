import { Router, Request, Response } from 'express';
import { Operator } from '../../../infrastructure/database/models/Operator';
import { User } from '../../../infrastructure/database/models';
import { requireAuth, requireRole } from '../../../shared/middlewares/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Operators
 *   description: Gestión de operadores de monitoreo y despacho
 */

/**
 * @swagger
 * /api/operators:
 *   get:
 *     summary: Listar todos los operadores
 *     tags: [Operators]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: shift
 *         schema:
 *           type: string
 *           enum: [mañana, tarde, noche, 24x48]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [en_servicio, disponible, en_descanso, inactivo]
 *     responses:
 *       200:
 *         description: Lista de operadores
 */
router.get('/', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const shift = req.query.shift as string | undefined;
    const status = req.query.status as string | undefined;

    const operators = await Operator.findAll({ shift, status });

    res.json({
      success: true,
      total: operators.length,
      data: operators,
    });
  } catch (error: any) {
    console.error('Error listando operadores:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/operators/stats:
 *   get:
 *     summary: Estadísticas rápidas de operadores
 *     tags: [Operators]
 */
router.get('/stats', requireAuth, requireRole(['admin', 'supervisor']), async (_req: Request, res: Response) => {
  try {
    const stats = await Operator.stats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error obteniendo estadísticas de operadores:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/operators/{id}:
 *   get:
 *     summary: Obtener un operador por ID
 *     tags: [Operators]
 */
router.get('/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const operator = await Operator.findById(req.params.id);
    if (!operator) {
      return res.status(404).json({ success: false, message: 'Operador no encontrado' });
    }
    res.json({ success: true, data: operator });
  } catch (error: any) {
    console.error('Error obteniendo operador:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/operators:
 *   post:
 *     summary: Crear un nuevo operador (también crea usuario del sistema)
 *     tags: [Operators]
 */
router.post('/', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      cedula,
      email,
      password,
      phone,
      consoleStation,
      shift,
      specialty,
      status,
      zoneAssigned,
    } = req.body;

    if (!fullName || !cedula || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nombre completo, cédula y correo son obligatorios',
      });
    }

    let userId: string | undefined;

    // Also create/find the linked user account if password provided
    if (password) {
      try {
        const existingUser = await User.findByEmail(email);
        if (!existingUser) {
          const newUser = await User.create({
            fullName,
            cedula,
            email,
            password,
            phone,
            role: 'operator',
            isVerified: true,
            facialVerificationStatus: 'verified',
          });
          userId = newUser.id;
        } else {
          userId = existingUser.id;
        }
      } catch (userErr: any) {
        console.warn('No se pudo crear usuario del sistema vinculado:', userErr.message);
      }
    }

    const operator = await Operator.create({
      userId,
      fullName,
      cedula,
      email,
      phone,
      consoleStation,
      shift,
      specialty,
      status,
      zoneAssigned,
    });

    res.status(201).json({
      success: true,
      message: 'Operador registrado exitosamente',
      data: operator,
    });
  } catch (error: any) {
    console.error('Error creando operador:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Error al crear operador' });
  }
});

/**
 * @swagger
 * /api/operators/{id}:
 *   patch:
 *     summary: Actualizar datos de un operador
 *     tags: [Operators]
 */
router.patch('/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      phone,
      consoleStation,
      shift,
      specialty,
      status,
      zoneAssigned,
    } = req.body;

    const updated = await Operator.update(req.params.id, {
      fullName,
      phone,
      consoleStation,
      shift,
      specialty,
      status,
      zoneAssigned,
    });

    res.json({
      success: true,
      message: 'Operador actualizado exitosamente',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error actualizando operador:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Error al actualizar operador' });
  }
});

/**
 * @swagger
 * /api/operators/{id}:
 *   delete:
 *     summary: Dar de baja a un operador
 *     tags: [Operators]
 */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    await Operator.delete(req.params.id);
    res.json({ success: true, message: 'Operador dado de baja exitosamente' });
  } catch (error: any) {
    console.error('Error eliminando operador:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Error al eliminar operador' });
  }
});

export { router as operatorsRouter };
