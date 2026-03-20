const IS_PRODUCTION = false; // Cambia a TRUE cuando despliegues a la nube
const DEV_URL = 'http://10.83.151.179:3001'; 
const PROD_URL = 'https://api.tudominio.com'; // Sustituir por tu dominio real con SSL

const API_URL = IS_PRODUCTION ? PROD_URL : DEV_URL;

export const config = {
  API_URL,
  SOCKET_URL: API_URL,
  CITIZENS_NAMESPACE: '/citizens',
};
