import { Router, Request, Response } from 'express';
import { User, Role } from '../../../infrastructure/database/models';
import {
  requireAuth,
  requireRole,
  getRequestUserId,
  AuthRequest,
} from '../../../shared/middlewares/auth';
import {
  ADMIN_ONLY_ROLES,
  ADMIN_SUPERVISOR_ROLES,
  FACIAL_VERIFICATION_STATUSES,
  STANDARD_SYSTEM_ROLES,
} from '../../../shared/constants/system';
import { KycVerificationService } from '../../kyc/services/KycVerificationService';

const router = Router();

async function validateAssignableRole(
  targetRole: string,
  actorRole?: string
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const dbRole = await Role.findById(targetRole);
  if (!dbRole && !STANDARD_SYSTEM_ROLES.includes(targetRole)) {
    return {
      ok: false,
      status: 400,
      message: `Rol '${targetRole}' no válido o no configurado`,
    };
  }
  if (ADMIN_SUPERVISOR_ROLES.includes(targetRole) && actorRole !== 'admin') {
    return {
      ok: false,
      status: 403,
      message: 'Solo un admin puede asignar roles de supervisor o admin',
    };
  }
  return { ok: true };
}

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
router.get('/', requireAuth, requireRole(ADMIN_SUPERVISOR_ROLES), async (req: Request, res: Response) => {
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
      data: users.map((u: any) => User.toDTO(u)),
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
router.get('/:id', requireAuth, requireRole(ADMIN_SUPERVISOR_ROLES), async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      data: User.toDTO(user),
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
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear un usuario manualmente (solo admin/supervisor)
 *     tags: [Users]
 */
router.post('/', requireAuth, requireRole(ADMIN_SUPERVISOR_ROLES), async (req: Request, res: Response) => {
  try {
    const { fullName, cedula, email, password, role, phone, ciudad, isVerified } = req.body;

    if (!fullName || !cedula || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nombre, cédula, email y contraseña son obligatorios' });
    }

    const existingCedula = await User.findByCedula(cedula);
    if (existingCedula) {
      return res.status(409).json({ success: false, message: 'Ya existe un usuario con esa cédula' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese email' });
    }

    const targetRole = role || 'citizen';
    const actorRole = (req as AuthRequest).user?.role;
    const roleCheck = await validateAssignableRole(targetRole, actorRole);
    if (!roleCheck.ok) {
      return res.status(roleCheck.status).json({ success: false, message: roleCheck.message });
    }

    const user = await User.create({
      fullName,
      cedula,
      email,
      password,
      role: targetRole,
      phone,
      ciudad,
      isVerified: isVerified !== undefined ? isVerified : true,
      facialVerificationStatus: 'verified',
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: User.toDTO(user),
    });
  } catch (error: any) {
    console.error('Error creando usuario:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
});

router.patch('/:id', requireAuth, requireRole(ADMIN_SUPERVISOR_ROLES), async (req: Request, res: Response) => {
  try {
    const { fullName, role, phone, ciudad, isVerified, facialVerificationStatus } = req.body;

    if (role) {
      const actorRole = (req as AuthRequest).user?.role;
      const roleCheck = await validateAssignableRole(role, actorRole);
      if (!roleCheck.ok) {
        return res.status(roleCheck.status).json({ success: false, message: roleCheck.message });
      }
    }

    if (
      facialVerificationStatus &&
      !FACIAL_VERIFICATION_STATUSES.includes(facialVerificationStatus)
    ) {
      return res.status(400).json({ success: false, message: 'Estado de verificación facial inválido' });
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
      data: User.toDTO(updated),
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
router.delete('/:id', requireAuth, requireRole(ADMIN_ONLY_ROLES), async (req: Request, res: Response) => {
  try {
    const existing = await User.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Prevent self-deletion
    const actorId = getRequestUserId(req);
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

/**
 * @swagger
 * /api/users/{id}/kyc-dossier:
 *   get:
 *     summary: Descifrar y auditar expediente biométrico KYC (Ley 1581 — solo admin/supervisor)
 *     tags: [Users]
 */
router.get('/:id/kyc-dossier', requireAuth, requireRole(ADMIN_SUPERVISOR_ROLES), async (req: Request, res: Response) => {
  try {
    const actorId = getRequestUserId(req) || '';
    const dossier = await KycVerificationService.getDecryptedKycDossier(
      req.params.id,
      actorId,
      req.ip
    );
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Expediente no encontrado' });
    }
    res.json({ success: true, data: dossier });
  } catch (error: any) {
    console.error('Error descifrando expediente KYC:', error.message);
    res.status(500).json({ success: false, message: 'Error al recuperar expediente cifrado' });
  }
});

export { router as usersRouter };
