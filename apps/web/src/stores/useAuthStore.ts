import { create } from 'zustand';
import { authService, type AuthResponse } from '../services/auth';

interface AuthState {
  user: AuthResponse['data']['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthResponse['data']['user'] | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = authService.getToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // Fetch user profile to validate token and get latest role
      const response = await authService.getMe();
      if (response.success && response.data) {
        set({ user: response.data, isAuthenticated: true });
        // Ensure role and ciudad are up to date in localStorage
        authService.setToken(token, response.data.id, response.data.role, response.data.ciudad);
      } else {
        throw new Error('Invalid token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      authService.logout();
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
  },
}));
