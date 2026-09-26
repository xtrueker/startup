import axios from 'axios';

// URL del backend (API)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: agregar token a las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      // --- DEV BYPASS ---
      // window.location.href = '/login';
      console.warn("401 Unauthorized pero ignorado por el DEV BYPASS");
      // ------------------
    }
    return Promise.reject(error);
  }
);

export default api;