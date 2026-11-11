import { Router, Request, Response } from 'express';
import { Team } from '../../../infrastructure/database/models/Team';
import { requireAuth, requireRole } from '../../../shared/middlewares/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Teams
 *   description: Gestión de equipos y unidades de campo
 */

/**
 * @swagger
 * /api/teams:
 *   get:
 *     summary: Listar todos los equipos con sus miembros
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teamType
 *         schema:
 *           type: string
 *           enum: [patrulla, ambulancia, motorizada, tactica, vigilancia]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [patrullando, disponible, en_incidente, fuera_servicio]
 *     responses:
 *       200:
 *         description: Lista de equipos
 */
router.get('/', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (req: Request, res: Response) => {
  try {
    const teamType = req.query.teamType as string | undefined;
    const status = req.query.status as string | undefined;

    const teams = await Team.findAll({ teamType, status });

    res.json({
      success: true,
      total: teams.length,
      data: teams,
    });
  } catch (error: any) {
    console.error('Error listando equipos:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/teams/stats:
 *   get:
 *     summary: Estadísticas de equipos
 *     tags: [Teams]
 */
router.get('/stats', requireAuth, requireRole(['admin', 'supervisor']), async (_req: Request, res: Response) => {
  try {
    const stats = await Team.stats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error obteniendo estadísticas de equipos:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/teams/{id}:
 *   get:
 *     summary: Obtener un equipo por ID (incluye miembros)
 *     tags: [Teams]
 */
router.get('/:id', requireAuth, requireRole(['admin', 'supervisor', 'operator']), async (req: Request, res: Response) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }
    res.json({ success: true, data: team });
  } catch (error: any) {
    console.error('Error obteniendo equipo:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/teams:
 *   post:
 *     summary: Crear un nuevo equipo con su dotación de personal
 *     tags: [Teams]
 */
router.post('/', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const {
      teamName,
      teamType,
      leaderUsername,
      leaderEmail,
      leaderId,
      mainVehiclePlate,
      assignedZone,
      status,
      members,
    } = req.body;

    if (!teamName) {
      return res.status(400).json({ success: false, message: 'El nombre del equipo es obligatorio' });
    }
    if (!leaderUsername || !leaderEmail || !leaderId) {
      return res.status(400).json({ success: false, message: 'Los datos del líder son obligatorios' });
    }
    if (!mainVehiclePlate) {
      return res.status(400).json({ success: false, message: 'La placa del vehículo principal es obligatoria' });
    }

    const team = await Team.create({
      teamName,
      teamType,
      leaderUsername,
      leaderEmail,
      leaderId,
      mainVehiclePlate,
      assignedZone,
      status,
      members,
    });

    res.status(201).json({
      success: true,
      message: 'Equipo creado exitosamente',
      data: team,
    });
  } catch (error: any) {
    console.error('Error creando equipo:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Error al crear equipo' });
  }
});

/**
 * @swagger
 * /api/teams/{id}:
 *   patch:
 *     summary: Actualizar datos de un equipo
 *     tags: [Teams]
 */
router.patch('/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const {
      teamName,
      teamType,
      leaderUsername,
      leaderEmail,
      leaderId,
      mainVehiclePlate,
      assignedZone,
      status,
    } = req.body;

    const updated = await Team.update(req.params.id, {
      teamName,
      teamType,
      leaderUsername,
      leaderEmail,
      leaderId,
      mainVehiclePlate,
      assignedZone,
      status,
    });

    res.json({
      success: true,
      message: 'Equipo actualizado exitosamente',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error actualizando equipo:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Error al actualizar equipo' });
  }
});

/**
 * @swagger
 * /api/teams/{id}:
 *   delete:
 *     summary: Eliminar un equipo (elimina también sus miembros)
 *     tags: [Teams]
 */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    await Team.delete(req.params.id);
    res.json({ success: true, message: 'Equipo eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error eliminando equipo:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Error al eliminar equipo' });
  }
});

/**
 * @swagger
 * /api/teams/{id}/members:
 *   post:
 *     summary: Agregar un integrante a un equipo existente
 *     tags: [Teams]
 */
router.post('/:id/members', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const { name, identification, badgeOrPlate, roleInTeam } = req.body;

    if (!name || !identification) {
      return res.status(400).json({
        success: false,
        message: 'Nombre e identificación del integrante son obligatorios',
      });
    }

    const member = await Team.addMember(req.params.id, {
      name,
      identification,
      badgeOrPlate,
      roleInTeam,
    });

    res.status(201).json({
      success: true,
      message: 'Integrante agregado exitosamente',
      data: member,
    });
  } catch (error: any) {
    console.error('Error agregando integrante:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Error al agregar integrante' });
  }
});

/**
 * @swagger
 * /api/teams/{id}/members/{memberId}:
 *   delete:
 *     summary: Eliminar un integrante de un equipo
 *     tags: [Teams]
 */
router.delete('/:id/members/:memberId', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    await Team.removeMember(req.params.id, req.params.memberId);
    res.json({ success: true, message: 'Integrante eliminado del equipo' });
  } catch (error: any) {
    console.error('Error eliminando integrante:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Error al eliminar integrante' });
  }
});

export { router as teamsRouter };
