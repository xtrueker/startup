import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Resolución dinámica de servidor:
 * 1. En builds productivos/staging (EAS Build / Web Deploy), usa EXPO_PUBLIC_API_URL (HTTPS + WSS).
 * 2. En desarrollo local Web usa localhost:3001.
 * 3. En dispositivos físicos en red local (iOS / Android) detecta automáticamente la IP LAN de Metro.
 */
const getDevHost = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return hostUri.split(':')[0];
  }
  return '192.168.0.16';
};

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const LAN_URL = `http://${getDevHost()}:3001`;
const LOCAL_URL = 'http://localhost:3001';

const resolvedApiUrl = envApiUrl
  ? envApiUrl.replace(/\/+$/, '')
  : Platform.OS === 'web'
  ? LOCAL_URL
  : LAN_URL;

export const config = {
  API_URL: resolvedApiUrl,
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL?.trim() || resolvedApiUrl,
  CITIZENS_NAMESPACE: '/citizens',
  IS_PRODUCTION: Boolean(envApiUrl),
};
