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

type AuthListener = (isAuthenticated: boolean) => void;
const authListeners = new Set<AuthListener>();

function notifyAuthChange(isAuthenticated: boolean) {
  authListeners.forEach((listener) => {
    try {
      listener(isAuthenticated);
    } catch (e) {
      console.error('[AuthService] Error en listener de autenticación:', e);
    }
  });
}

const api = axios.create({ baseURL: `${config.API_URL}/api` });

// Auto-inject JWT token into every request
api.interceptors.request.use(async (req) => {
  const token = await safeStorage.getItemAsync('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// Auto-logout si el token expira o es rechazado (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[AuthService] 401 Unauthorized detectado. Expulsando sesión...');
      await authService.logout();
    }
    return Promise.reject(error);
  }
);

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  cedula: string;
  email: string;
  password: string;
  phone?: string;
  idCardFront?: string;
  idCardBack?: string;
  selfiePhoto?: string;
  livenessProofToken?: string;
}

export const authService = {
  login: async (data: LoginData) => {
    const res = await api.post('/auth/login', data);
    const { token, user } = res.data.data;
    await safeStorage.setItemAsync('token', token);
    await safeStorage.setItemAsync('userId', user.id);
    await safeStorage.setItemAsync('userRole', user.role);
    await safeStorage.setItemAsync('userProfile', JSON.stringify(user));
    notifyAuthChange(true);
    return user;
  },

  register: async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    const { token, user } = res.data.data;
    await safeStorage.setItemAsync('token', token);
    await safeStorage.setItemAsync('userId', user.id);
    await safeStorage.setItemAsync('userRole', user.role);
    await safeStorage.setItemAsync('userProfile', JSON.stringify(user));
    notifyAuthChange(true);
    return user;
  },

  analyzeDocument: async (payload: {
    imageBase64: string;
    side: 'front' | 'back';
  }): Promise<{
    valid: boolean;
    side: 'front' | 'back';
    documentType: string;
    detectedCedula: string | null;
    detectedFullName: string | null;
    faceConfidence: number | null;
  }> => {
    const res = await api.post('/auth/analyze-document', payload);
    return res.data.data;
  },

  getLivenessChallenge: async (): Promise<{
    challengeType: 'smile' | 'turn_head' | 'open_mouth';
    step1Prompt: string;
    step2Prompt: string;
    challengeToken: string;
  }> => {
    const res = await api.get('/auth/liveness-challenge');
    return res.data.data;
  },

  probeLiveness: async (payload: {
    stage: 'align_neutral' | 'perform_gesture';
    frameBase64: string;
    token: string;
  }): Promise<{
    status: 'coaching' | 'neutral_locked' | 'gesture_locked' | 'spoof_blocked';
    tone: 'neutral' | 'amber' | 'aqua' | 'emerald' | 'crimson';
    guidance: string;
    nextToken?: string;
  }> => {
    const res = await api.post('/auth/liveness-probe', payload);
    return res.data.data;
  },

  verifyBiometrics: async (payload: {
    idCardFront: string;
    selfieNeutral: string;
    selfiePhoto: string;
    challengeToken: string;
  }): Promise<{
    verified: boolean;
    similarityScore: number;
    livenessProofToken: string;
  }> => {
    const res = await api.post('/auth/verify-biometrics', payload);
    return res.data.data;
  },

  logout: async () => {
    await safeStorage.deleteItemAsync('token');
    await safeStorage.deleteItemAsync('userId');
    await safeStorage.deleteItemAsync('userRole');
    await safeStorage.deleteItemAsync('userProfile');
    notifyAuthChange(false);
  },

  subscribe: (listener: AuthListener) => {
    authListeners.add(listener);
    return () => {
      authListeners.delete(listener);
    };
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
