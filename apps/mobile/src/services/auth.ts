import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { config } from '../config';

const api = axios.create({ baseURL: `${config.API_URL}/api` });

// Auto-inject JWT token into every request
api.interceptors.request.use(async (req) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export interface LoginData { email: string; password: string; }
export interface RegisterData { fullName: string; cedula: string; email: string; password: string; }

export const authService = {
  login: async (data: LoginData) => {
    const res = await api.post('/auth/login', data);
    const { token, user } = res.data.data;
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('userId', user.id);
    await SecureStore.setItemAsync('userRole', user.role);
    await SecureStore.setItemAsync('userProfile', JSON.stringify(user));
    return user;
  },

  register: async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    const { token, user } = res.data.data;
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('userId', user.id);
    await SecureStore.setItemAsync('userRole', user.role);
    await SecureStore.setItemAsync('userProfile', JSON.stringify(user));
    return user;
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('userRole');
    await SecureStore.deleteItemAsync('userProfile');
  },

  getToken: () => SecureStore.getItemAsync('token'),
  getUserId: () => SecureStore.getItemAsync('userId'),
  getProfile: async () => {
    const json = await SecureStore.getItemAsync('userProfile');
    return json ? JSON.parse(json) : null;
  },
  getApiUrl: () => config.API_URL,
  isAuthenticated: async () => !!(await SecureStore.getItemAsync('token')),
};

export { api };
