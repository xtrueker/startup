import api from './api';

export interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  isSystem: boolean;
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRoleDTO {
  id?: string;
  name: string;
  description?: string;
  permissions: string[];
}

export const rolesService = {
  /**
   * Obtener todos los roles desde el backend
   */
  getRoles: async (): Promise<Role[]> => {
    const response = await api.get('/roles');
    return response.data.data;
  },

  /**
   * Crear un nuevo rol en la base de datos
   */
  createRole: async (data: CreateRoleDTO): Promise<Role> => {
    const response = await api.post('/roles', data);
    return response.data.data;
  },

  /**
   * Actualizar rol existente
   */
  updateRole: async (id: string, data: Partial<CreateRoleDTO>): Promise<Role> => {
    const response = await api.patch(`/roles/${id}`, data);
    return response.data.data;
  },

  /**
   * Eliminar rol personalizado
   */
  deleteRole: async (id: string): Promise<void> => {
    await api.delete(`/roles/${id}`);
  },
};

export default rolesService;
