import { supabase, getPgPool } from '../connection';

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
    const sb = supabase();
    const { data: roles, error } = await sb
      .from('roles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      // Fallback usando pgPool si postgrest cache aún no refresca
      try {
        const pool = getPgPool();
        const res = await pool.query('SELECT * FROM public.roles ORDER BY created_at ASC');
        return this.formatRoles(res.rows);
      } catch (poolErr) {
        throw error;
      }
    }

    return await this.formatRoles(roles || []);
  }

  private static async formatRoles(roles: any[]): Promise<RoleDTO[]> {
    const sb = supabase();
    const { data: users } = await sb.from('users').select('role');

    const counts: Record<string, number> = {};
    if (users) {
      for (const u of users) {
        if (u.role) {
          counts[u.role] = (counts[u.role] || 0) + 1;
        }
      }
    }

    return roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      isSystem: Boolean(r.is_system),
      userCount: counts[r.id] || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  /**
   * Buscar un rol por su identificador único (ID/Slug)
   */
  static async findById(id: string): Promise<any> {
    const sb = supabase();
    const { data, error } = await sb
      .from('roles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      const pool = getPgPool();
      const res = await pool.query('SELECT * FROM public.roles WHERE id = $1 LIMIT 1', [id]);
      return res.rows[0] || null;
    }

    return data;
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
    // Generar slug normalizado a partir del ID o el nombre
    let id = (payload.id || payload.name)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (!id) {
      id = `role_${Date.now()}`;
    }

    // Verificar si ya existe
    const existing = await this.findById(id);
    if (existing) {
      throw new Error(`Ya existe un rol con el identificador '${id}'`);
    }

    const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
    const isSystem = Boolean(payload.isSystem);

    const query = `
      INSERT INTO public.roles (id, name, description, permissions, is_system, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *;
    `;

    const res = await pool.query(query, [
      id,
      payload.name.trim(),
      payload.description?.trim() || '',
      permissions,
      isSystem
    ]);

    const created = res.rows[0];
    return {
      id: created.id,
      name: created.name,
      description: created.description || '',
      permissions: created.permissions || [],
      isSystem: Boolean(created.is_system),
      userCount: 0,
      createdAt: created.created_at,
      updatedAt: created.updated_at
    };
  }

  /**
   * Actualizar rol existente
   */
  static async update(id: string, updates: {
    name?: string;
    description?: string;
    permissions?: string[];
  }): Promise<RoleDTO> {
    const pool = getPgPool();
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Rol '${id}' no encontrado`);
    }

    const newName = updates.name !== undefined ? updates.name.trim() : existing.name;
    const newDesc = updates.description !== undefined ? updates.description.trim() : existing.description;
    const newPerms = updates.permissions !== undefined ? updates.permissions : existing.permissions;

    const query = `
      UPDATE public.roles
      SET name = $1, description = $2, permissions = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *;
    `;

    const res = await pool.query(query, [newName, newDesc, newPerms, id]);
    const updated = res.rows[0];

    const sb = supabase();
    const { count } = await sb.from('users').select('*', { count: 'exact', head: true }).eq('role', id);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description || '',
      permissions: updated.permissions || [],
      isSystem: Boolean(updated.is_system),
      userCount: count || 0,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
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

    // Verificar si hay usuarios con este rol asignado
    const sb = supabase();
    const { count } = await sb.from('users').select('*', { count: 'exact', head: true }).eq('role', id);
    if (count && count > 0) {
      throw new Error(`No se puede eliminar el rol porque tiene ${count} usuario(s) asignado(s)`);
    }

    const pool = getPgPool();
    await pool.query('DELETE FROM public.roles WHERE id = $1', [id]);
    return true;
  }
}

export default Role;
