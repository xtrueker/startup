import { getPgPool } from '../connection';

export interface RoleDTO {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export class Role {
  /**
   * Obtener todos los roles con conteo de usuarios asignados
   */
  static async findAll(): Promise<RoleDTO[]> {
    const pool = getPgPool();
    const res = await pool.query('SELECT * FROM public.roles ORDER BY created_at ASC');
    return this.formatRoles(res.rows);
  }

  private static async formatRoles(roles: any[]): Promise<RoleDTO[]> {
    const pool = getPgPool();
    const grouped = await pool.query(
      `SELECT role, COUNT(*)::int AS total FROM public.users WHERE role IS NOT NULL GROUP BY role`
    );

    const counts: Record<string, number> = {};
    for (const row of grouped.rows) {
      counts[row.role] = Number(row.total) || 0;
    }

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      isSystem: Boolean(r.is_system),
      userCount: counts[r.id] || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Buscar un rol por su identificador único (ID/Slug)
   */
  static async findById(id: string): Promise<any> {
    const pool = getPgPool();
    const res = await pool.query('SELECT * FROM public.roles WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] || null;
  }

  /**
   * Crear un nuevo rol en la base de datos
   */
  static async create(payload: {
    id?: string;
    name: string;
    description?: string;
    permissions?: string[];
    isSystem?: boolean;
  }): Promise<RoleDTO> {
    const pool = getPgPool();
    let id = (payload.id || payload.name)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (!id) {
      id = `role_${Date.now()}`;
    }

    const existing = await this.findById(id);
    if (existing) {
      throw new Error(`Ya existe un rol con el identificador '${id}'`);
    }

    const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
    const isSystem = Boolean(payload.isSystem);

    const res = await pool.query(
      `INSERT INTO public.roles (id, name, description, permissions, is_system, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [id, payload.name.trim(), payload.description?.trim() || '', permissions, isSystem]
    );

    const created = res.rows[0];
    return {
      id: created.id,
      name: created.name,
      description: created.description || '',
      permissions: created.permissions || [],
      isSystem: Boolean(created.is_system),
      userCount: 0,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    };
  }

  /**
   * Actualizar rol existente
   */
  static async update(
    id: string,
    updates: {
      name?: string;
      description?: string;
      permissions?: string[];
    }
  ): Promise<RoleDTO> {
    const pool = getPgPool();
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Rol '${id}' no encontrado`);
    }

    const newName = updates.name !== undefined ? updates.name.trim() : existing.name;
    const newDesc =
      updates.description !== undefined ? updates.description.trim() : existing.description;
    const newPerms =
      updates.permissions !== undefined ? updates.permissions : existing.permissions;

    const res = await pool.query(
      `UPDATE public.roles
       SET name = $1, description = $2, permissions = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [newName, newDesc, newPerms, id]
    );
    const updated = res.rows[0];

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM public.users WHERE role = $1`,
      [id]
    );

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description || '',
      permissions: updated.permissions || [],
      isSystem: Boolean(updated.is_system),
      userCount: Number(countRes.rows[0]?.total) || 0,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }

  /**
   * Eliminar rol (solo si no es de sistema)
   */
  static async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Rol '${id}' no encontrado`);
    }

    if (existing.is_system) {
      throw new Error('Los roles del sistema no pueden ser eliminados');
    }

    const pool = getPgPool();
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM public.users WHERE role = $1`,
      [id]
    );
    const count = Number(countRes.rows[0]?.total) || 0;
    if (count > 0) {
      throw new Error(
        `No se puede eliminar el rol porque tiene ${count} usuario(s) asignado(s)`
      );
    }

    await pool.query('DELETE FROM public.roles WHERE id = $1', [id]);
    return true;
  }
}

export default Role;
