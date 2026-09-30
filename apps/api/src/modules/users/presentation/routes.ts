import { Router, Request, Response } from 'express';
import { User } from '../../../infrastructure/database/models';
import { requireAuth, requireRole } from '../../../shared/middlewares/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestión de usuarios (solo admin/supervisor)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Listar todos los usuarios
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [citizen, operator, supervisor, admin]
 *         description: Filtrar por rol
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Número máximo de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Paginación — registros a saltar
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Sin permisos
 */
router.get('/', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const role = req.query.role as string | undefined;

    const { users, total } = await User.findAll(limit, offset, role);

    res.json({
      success: true,
      total,
      limit,
      offset,
      data: users.map((u: any) => ({
        id: u.id,
        fullName: u.full_name,
        cedula: u.cedula,
        email: u.email,
        role: u.role,
        phone: u.phone,
        ciudad: u.ciudad,
        isVerified: u.is_verified,
        facialVerificationStatus: u.facial_verification_status,
        createdAt: u.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Error listando usuarios:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Datos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        fullName: user.full_name,
        cedula: user.cedula,
        email: user.email,
        role: user.role,
        phone: user.phone,
        ciudad: user.ciudad,
        isVerified: user.is_verified,
        facialVerificationStatus: user.facial_verification_status,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo usuario:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Actualizar datos de un usuario
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [citizen, operator, supervisor, admin]
 *               phone:
 *                 type: string
 *               ciudad:
 *                 type: string
 *                 example: "Bogotá"
 *               isVerified:
 *                 type: boolean
 *               facialVerificationStatus:
 *                 type: string
 *                 enum: [pending, verified, under_review, rejected]
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       400:
 *         description: Rol inválido
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const { fullName, role, phone, ciudad, isVerified, facialVerificationStatus } = req.body;

    const validRoles = ['citizen', 'operator', 'supervisor', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Rol inválido. Permitidos: ${validRoles.join(', ')}` });
    }

    const validFacialStatuses = ['pending', 'verified', 'under_review', 'rejected'];
    if (facialVerificationStatus && !validFacialStatuses.includes(facialVerificationStatus)) {
      return res.status(400).json({ success: false, message: 'Estado de verificación facial inválido' });
    }

    // Solo admin puede cambiar roles a supervisor/admin
    const actorRole = (req as any).user?.role;
    if (role && ['supervisor', 'admin'].includes(role) && actorRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo un admin puede asignar roles de supervisor o admin' });
    }

    const updated = await User.update(req.params.id, {
      fullName, role, phone, ciudad, isVerified, facialVerificationStatus
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: {
        id: updated.id,
        fullName: updated.full_name,
        cedula: updated.cedula,
        email: updated.email,
        role: updated.role,
        phone: updated.phone,
        ciudad: updated.ciudad,
        isVerified: updated.is_verified,
        facialVerificationStatus: updated.facial_verification_status,
        createdAt: updated.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error actualizando usuario:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Eliminar un usuario (solo admin)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Usuario eliminado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Usuario no encontrado
 */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const existing = await User.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Prevent self-deletion
    const actorId = (req as any).user?.userId;
    if (actorId === req.params.id) {
      return res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta' });
    }

    await User.delete(req.params.id);
    res.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error eliminando usuario:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

export { router as usersRouter };
