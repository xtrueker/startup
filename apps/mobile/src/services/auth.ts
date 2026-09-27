import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { config } from '../config';

// Cross-platform safe storage: SecureStore on Native (iOS/Android), localStorage on Web
const safeStorage = {
  getItemAsync: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`[SafeStorage] Error getting ${key}:`, e);
      return null;
    }
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      } catch {}
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn(`[SafeStorage] Error setting ${key}:`, e);
    }
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      } catch {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn(`[SafeStorage] Error deleting ${key}:`, e);
    }
  },
};

const api = axios.create({ baseURL: `${config.API_URL}/api` });

// Auto-inject JWT token into every request
api.interceptors.request.use(async (req) => {
  const token = await safeStorage.getItemAsync('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export interface LoginData { email: string; password: string; }
export interface RegisterData { fullName: string; cedula: string; email: string; password: string; }

export const authService = {
  login: async (data: LoginData) => {
    const res = await api.post('/auth/login', data);
    const { token, user } = res.data.data;
    await safeStorage.setItemAsync('token', token);
    await safeStorage.setItemAsync('userId', user.id);
    await safeStorage.setItemAsync('userRole', user.role);
    await safeStorage.setItemAsync('userProfile', JSON.stringify(user));
    return user;
  },

  register: async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    const { token, user } = res.data.data;
    await safeStorage.setItemAsync('token', token);
    await safeStorage.setItemAsync('userId', user.id);
    await safeStorage.setItemAsync('userRole', user.role);
    await safeStorage.setItemAsync('userProfile', JSON.stringify(user));
    return user;
  },

  logout: async () => {
    await safeStorage.deleteItemAsync('token');
    await safeStorage.deleteItemAsync('userId');
    await safeStorage.deleteItemAsync('userRole');
    await safeStorage.deleteItemAsync('userProfile');
  },

  getToken: () => safeStorage.getItemAsync('token'),
  getUserId: () => safeStorage.getItemAsync('userId'),
  getProfile: async () => {
    const json = await safeStorage.getItemAsync('userProfile');
    return json ? JSON.parse(json) : null;
  },
  getApiUrl: () => config.API_URL,
  isAuthenticated: async () => !!(await safeStorage.getItemAsync('token')),
};

export { api };
