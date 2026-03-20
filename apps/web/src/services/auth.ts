import api from './api';

// Interfaces
export interface RegisterData {
  fullName: string;
  cedula: string;
  email: string;
  password: string;
  role?: 'citizen' | 'operator' | 'supervisor' | 'admin';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      fullName: string;
      cedula: string;
      email: string;
      role: string;
      isVerified: boolean;
      facialVerificationStatus: string;
    };
    token: string;
  };
}

// Funciones de autenticación
export const authService = {
  // Registro
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Login
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  // Guardar token, userId y role
  setToken: (token: string, userId?: string, role?: string) => {
    localStorage.setItem('token', token);
    if (userId) {
      localStorage.setItem('userId', userId);
    }
    if (role) {
      localStorage.setItem('userRole', role);
    }
  },

  // Obtener token
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  // Obtener userId
  getUserId: (): string | null => {
    return localStorage.getItem('userId');
  },

  // Obtener rol
  getRole: (): string | null => {
    return localStorage.getItem('userRole');
  },

  // Eliminar token, userId y role (logout)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
  },

  // Verificar si está autenticado
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },
};