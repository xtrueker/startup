import { Router, Request, Response } from 'express';
import { Role } from '../../../infrastructure/database/models';
import { requireAuth, requireRole } from '../../../shared/middlewares/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Gestión de roles y privilegios de acceso
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Listar todos los roles configurados
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: Lista de roles
 */
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const roles = await Role.findAll();
    res.json({
      success: true,
      data: roles,
    });
  } catch (error: any) {
    console.error('Error listando roles:', error.message);
    res.status(500).json({ success: false, message: 'Error interno al consultar roles' });
  }
});

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Crear un nuevo rol (solo admin/supervisor)
 *     tags: [Roles]
 */
router.post('/', requireAuth, requireRole(['admin', 'supervisor']), async (req: Request, res: Response) => {
  try {
    const { id, name, description, permissions } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre del rol es obligatorio' });
    }

    const created = await Role.create({
      id: id ? String(id).trim() : undefined,
      name: name.trim(),
      description: description ? String(description).trim() : '',
      permissions: Array.isArray(permissions) ? permissions : [],
      isSystem: false,
    });

    res.status(201).json({
      success: true,
      message: 'Rol creado exitosamente',
      data: created,
    });
  } catch (error: any) {
    console.error('Error creando rol:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Error al crear rol' });
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   patch:
 *     summary: Actualizar un rol existente (solo admin)
 *     tags: [Roles]
 */
router.patch('/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const updated = await Role.update(id, {
      name,
      description,
      permissions,
    });

    res.json({
      success: true,
      message: 'Rol actualizado exitosamente',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error actualizando rol:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Error al actualizar rol' });
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Eliminar un rol personalizado (solo admin)
 *     tags: [Roles]
 */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Role.delete(id);

    res.json({
      success: true,
      message: 'Rol eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando rol:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Error al eliminar rol' });
  }
});

export { router as rolesRouter };
