import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

function parseFiniteEnvNumber(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Detecta automáticamente el host LAN de desarrollo desde Expo / Metro bundler
 * sin depender de una dirección IP doméstica quemada en código.
 */
function resolveDevHost(): string {
  const explicitDevHost = process.env.EXPO_PUBLIC_DEV_HOST?.trim();
  if (explicitDevHost) {
    return explicitDevHost;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;
  if (typeof hostUri === 'string' && hostUri.trim()) {
    return hostUri.trim().split(':')[0];
  }

  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (typeof scriptURL === 'string') {
    const match = scriptURL.match(/^https?:\/\/([^/:]+)/i);
    if (match?.[1]) {
      return match[1];
    }
  }

  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const apiPort = process.env.EXPO_PUBLIC_API_PORT?.trim() || '3001';
const LAN_URL = `http://${resolveDevHost()}:${apiPort}`;
const LOCAL_URL = `http://localhost:${apiPort}`;

const resolvedApiUrl = envApiUrl
  ? envApiUrl.replace(/\/+$/, '')
  : Platform.OS === 'web'
    ? LOCAL_URL
    : LAN_URL;

const defaultLat = parseFiniteEnvNumber(process.env.EXPO_PUBLIC_DEFAULT_LAT, 7.0653);
const defaultLng = parseFiniteEnvNumber(process.env.EXPO_PUBLIC_DEFAULT_LNG, -73.8547);

export const config = {
  API_URL: resolvedApiUrl,
  SOCKET_URL: (process.env.EXPO_PUBLIC_SOCKET_URL?.trim() || resolvedApiUrl).replace(/\/+$/, ''),
  CITIZENS_NAMESPACE: '/citizens',
  IS_PRODUCTION: Boolean(envApiUrl),

  DEFAULT_MAP_REGION: {
    latitude: defaultLat,
    longitude: defaultLng,
    latitudeDelta: 0.018,
    longitudeDelta: 0.018,
  },
  FALLBACK_PANIC_COORDS: {
    latitude: defaultLat,
    longitude: defaultLng,
  },

  AUDIO_CHUNK_DURATION_MS: 15000,
  OFFLINE_SYNC_INTERVAL_MS: 15000,
  LOCATION_STREAM_INTERVAL_MS: 3000,
  DEFAULT_CAMERA_COVERAGE_RADIUS_M: 120,
  SOS_PERIMETER_RADIUS_M: 220,
  EMERGENCY_PUSH_CHANNEL_ID: 'rc-emergency-siren',

  REVERSE_GEOCODE_URL: (
    process.env.EXPO_PUBLIC_NOMINATIM_URL?.trim() ||
    'https://nominatim.openstreetmap.org/reverse'
  ).replace(/\/+$/, ''),

  MAP_ASSETS: {
    OSM_TILE_URL:
      process.env.EXPO_PUBLIC_OSM_TILE_URL?.trim() ||
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    LEAFLET_CSS_URL: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    LEAFLET_JS_URL: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    WEBVIEW_BASE_URL: 'https://redciudadana.app',
  },

  DEMO_ACCOUNT: {
    enabled: process.env.EXPO_PUBLIC_ENABLE_DEMO !== 'false',
    email: process.env.EXPO_PUBLIC_DEMO_EMAIL?.trim() || 'demo@redciudadana.org',
    password: process.env.EXPO_PUBLIC_DEMO_PASSWORD || 'password123',
  },
};
