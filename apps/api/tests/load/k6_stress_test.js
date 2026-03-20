import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas Especiales
export let errorRate = new Rate('errors');
export let ingestionLatency = new Trend('ingestion_duration');

// Configuración de Múltiples Escenarios
export let options = {
  discardResponseBodies: true, // Optimiza la CPU de k6 local
  scenarios: {
    // 1. Carga Normal (Baseline de rastreo pasivo)
    baseline: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m',
    },
    // 2. Pico Urbano Masivo (Manifestación o Concierto - Spike Test)
    urban_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5000 }, // Rampa brutal
        { duration: '1m', target: 5000 },  // Mantener carga extrema
        { duration: '30s', target: 0 },    // Bajar rampa
      ],
      startTime: '1m', // Inicia después del baseline
    },
  },
  thresholds: {
    // El 95% de las llamadas de emergencia deben ser insertadas en < 100ms (O(1))
    'http_req_duration': ['p(95)<100'],
    // La tasa de fallo debe ser absolutamente 0 para eventos críticos
    'errors': ['rate<0.001'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api';

/**
 * MOCK DATA GENERATOR
 */
function generatePanicPayload() {
  return JSON.stringify({
    traceId: `TEST-${Math.random().toString(36).substring(7)}`,
    latitude: 4.6097 + (Math.random() * 0.01),
    longitude: -74.0817 + (Math.random() * 0.01),
    address: 'Ubicación de Carga Sintética',
    description: 'Load Testing K6 Auto-Injection',
    // Fake Base64 simulando fragmento comprimido Opus
    audioChunk: 'UklGRiQAAABXQVZFZ...', 
    hash: 'fakehash123'
  });
}

/**
 * RUTA PRINCIPAL (Virtual User Loop)
 */
export default function () {
  const payload = generatePanicPayload();
  const headers = {
    'Content-Type': 'application/json',
    // Simulando tokens JWT
    'Authorization': `Bearer test-token-vu-${__VU}`
  };

  // Simulación del Burst de Offline Buffer (La App recuperó internet)
  const res = http.post(`${BASE_URL}/mobile/panic/sync`, payload, { headers });

  // Validaciones
  const success = check(res, {
    'ingestado en Gateway (202)': (r) => r.status === 202 || r.status === 200,
  });

  errorRate.add(!success);
  ingestionLatency.add(res.timings.duration);

  // Pensamiento humano aleatorio + Frecuencia de envío de chunk (ej. 3 segs en emergencia)
  sleep(Math.random() * 3 + 1); 
}
