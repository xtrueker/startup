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

const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_ID: 'userId',
  USER_ROLE: 'userRole',
  USER_PROFILE: 'userProfile',
} as const;

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

async function persistAuthenticatedSession(token: string, user: Record<string, any>) {
  await Promise.all([
    safeStorage.setItemAsync(STORAGE_KEYS.TOKEN, token),
    safeStorage.setItemAsync(STORAGE_KEYS.USER_ID, String(user.id)),
    safeStorage.setItemAsync(STORAGE_KEYS.USER_ROLE, String(user.role || 'citizen')),
    safeStorage.setItemAsync(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user)),
  ]);
  notifyAuthChange(true);
}

const api = axios.create({ baseURL: `${config.API_URL}/api` });

// Auto-inject JWT token into every request
api.interceptors.request.use(async (req) => {
  const token = await safeStorage.getItemAsync(STORAGE_KEYS.TOKEN);
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
    await persistAuthenticatedSession(token, user);
    return user;
  },

  register: async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    const { token, user } = res.data.data;
    await persistAuthenticatedSession(token, user);
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
    await Promise.all([
      safeStorage.deleteItemAsync(STORAGE_KEYS.TOKEN),
      safeStorage.deleteItemAsync(STORAGE_KEYS.USER_ID),
      safeStorage.deleteItemAsync(STORAGE_KEYS.USER_ROLE),
      safeStorage.deleteItemAsync(STORAGE_KEYS.USER_PROFILE),
    ]);
    notifyAuthChange(false);
  },

  subscribe: (listener: AuthListener) => {
    authListeners.add(listener);
    return () => {
      authListeners.delete(listener);
    };
  },

  getToken: () => safeStorage.getItemAsync(STORAGE_KEYS.TOKEN),
  getUserId: () => safeStorage.getItemAsync(STORAGE_KEYS.USER_ID),
  getProfile: async () => {
    const json = await safeStorage.getItemAsync(STORAGE_KEYS.USER_PROFILE);
    return json ? JSON.parse(json) : null;
  },
  getApiUrl: () => config.API_URL,
  isAuthenticated: async () => !!(await safeStorage.getItemAsync(STORAGE_KEYS.TOKEN)),
};

export { api };
