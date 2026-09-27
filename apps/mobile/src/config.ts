import { Platform } from 'react-native';

const IS_PRODUCTION = false; // Cambia a TRUE cuando despliegues a la nube
const LAN_URL = 'http://192.168.0.21:3001';
const LOCAL_URL = 'http://localhost:3001';
const PROD_URL = 'https://api.tudominio.com'; // Sustituir por tu dominio real con SSL

// En navegador web en PC usa localhost, en dispositivos físicos (iPhone/Android) usa la IP LAN
const DEV_URL = Platform.OS === 'web' ? LOCAL_URL : LAN_URL;
const API_URL = IS_PRODUCTION ? PROD_URL : DEV_URL;

export const config = {
  API_URL,
  SOCKET_URL: API_URL,
  CITIZENS_NAMESPACE: '/citizens',
};
