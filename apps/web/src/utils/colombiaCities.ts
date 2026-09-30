export interface CityCoordinate {
  name: string;
  department: string;
  lat: number;
  lng: number;
  zoom: number;
}

export const COLOMBIA_CITIES: CityCoordinate[] = [
  { name: 'Bogotá', department: 'Cundinamarca', lat: 4.6097, lng: -74.0817, zoom: 13 },
  { name: 'Medellín', department: 'Antioquia', lat: 6.2442, lng: -75.5812, zoom: 13 },
  { name: 'Cali', department: 'Valle del Cauca', lat: 3.4516, lng: -76.5320, zoom: 13 },
  { name: 'Barranquilla', department: 'Atlántico', lat: 10.9685, lng: -74.7813, zoom: 13 },
  { name: 'Cartagena', department: 'Bolívar', lat: 10.3910, lng: -75.4794, zoom: 13 },
  { name: 'Bucaramanga', department: 'Santander', lat: 7.1254, lng: -73.1198, zoom: 13 },
  { name: 'Cúcuta', department: 'Norte de Santander', lat: 7.8939, lng: -72.5078, zoom: 13 },
  { name: 'Pereira', department: 'Risaralda', lat: 4.8133, lng: -75.6961, zoom: 13 },
  { name: 'Santa Marta', department: 'Magdalena', lat: 11.2408, lng: -74.1990, zoom: 13 },
  { name: 'Ibagué', department: 'Tolima', lat: 4.4389, lng: -75.2322, zoom: 13 },
  { name: 'Manizales', department: 'Caldas', lat: 5.0689, lng: -75.5174, zoom: 13 },
  { name: 'Pasto', department: 'Nariño', lat: 1.2136, lng: -77.2811, zoom: 13 },
  { name: 'Neiva', department: 'Huila', lat: 2.9273, lng: -75.2819, zoom: 13 },
  { name: 'Villavicencio', department: 'Meta', lat: 4.1420, lng: -73.6266, zoom: 13 },
  { name: 'Armenia', department: 'Quindío', lat: 4.5339, lng: -75.6811, zoom: 13 },
  { name: 'Valledupar', department: 'Cesar', lat: 10.4631, lng: -73.2532, zoom: 13 },
  { name: 'Montería', department: 'Córdoba', lat: 8.7479, lng: -75.8814, zoom: 13 },
  { name: 'Sincelejo', department: 'Sucre', lat: 9.3047, lng: -75.3978, zoom: 13 },
  { name: 'Popayán', department: 'Cauca', lat: 2.4448, lng: -76.6147, zoom: 13 },
  { name: 'Tunja', department: 'Boyacá', lat: 5.5353, lng: -73.3678, zoom: 13 },
  { name: 'Riohacha', department: 'La Guajira', lat: 11.5444, lng: -72.9072, zoom: 13 },
  { name: 'Florencia', department: 'Caquetá', lat: 1.6144, lng: -75.6062, zoom: 13 },
  { name: 'Quibdó', department: 'Chocó', lat: 5.6947, lng: -76.6583, zoom: 13 },
  { name: 'Yopal', department: 'Casanare', lat: 5.3378, lng: -72.3959, zoom: 13 },
  { name: 'Arauca', department: 'Arauca', lat: 7.0847, lng: -70.7591, zoom: 13 },
  { name: 'Mocoa', department: 'Putumayo', lat: 1.1528, lng: -76.6521, zoom: 13 },
  { name: 'San José del Guaviare', department: 'Guaviare', lat: 2.5729, lng: -72.6459, zoom: 13 },
  { name: 'Mitú', department: 'Vaupés', lat: 1.2583, lng: -70.2333, zoom: 13 },
  { name: 'Puerto Carreño', department: 'Vichada', lat: 6.1890, lng: -67.4859, zoom: 13 },
  { name: 'Inírida', department: 'Guainía', lat: 3.8653, lng: -67.9239, zoom: 13 },
  { name: 'Leticia', department: 'Amazonas', lat: -4.2153, lng: -69.9406, zoom: 13 },
  { name: 'San Andrés', department: 'San Andrés y Providencia', lat: 12.5847, lng: -81.7006, zoom: 13 },
  { name: 'Bello', department: 'Antioquia', lat: 6.3373, lng: -75.5579, zoom: 13 },
  { name: 'Itagüí', department: 'Antioquia', lat: 6.1846, lng: -75.5991, zoom: 13 },
  { name: 'Envigado', department: 'Antioquia', lat: 6.1689, lng: -75.5802, zoom: 13 },
  { name: 'Soledad', department: 'Atlántico', lat: 10.9185, lng: -74.7646, zoom: 13 },
  { name: 'Soacha', department: 'Cundinamarca', lat: 4.5794, lng: -74.2169, zoom: 13 },
  { name: 'Palmira', department: 'Valle del Cauca', lat: 3.5394, lng: -76.3036, zoom: 13 },
  { name: 'Buenaventura', department: 'Valle del Cauca', lat: 3.8801, lng: -77.0312, zoom: 13 },
  { name: 'Floridablanca', department: 'Santander', lat: 7.0622, lng: -73.0864, zoom: 13 },
  { name: 'Barrancabermeja', department: 'Santander', lat: 7.0653, lng: -73.8547, zoom: 13 },
  { name: 'Dosquebradas', department: 'Risaralda', lat: 4.8340, lng: -75.6806, zoom: 13 },
  { name: 'Duitama', department: 'Boyacá', lat: 5.8245, lng: -73.0341, zoom: 13 },
  { name: 'Sogamoso', department: 'Boyacá', lat: 5.7145, lng: -72.9339, zoom: 13 },
  { name: 'Tuluá', department: 'Valle del Cauca', lat: 4.0847, lng: -76.1954, zoom: 13 },
  { name: 'Cartago', department: 'Valle del Cauca', lat: 4.7464, lng: -75.9117, zoom: 13 },
  { name: 'Chía', department: 'Cundinamarca', lat: 4.8617, lng: -74.0573, zoom: 13 },
  { name: 'Zipaquirá', department: 'Cundinamarca', lat: 5.0256, lng: -74.0040, zoom: 13 },
  { name: 'Girardot', department: 'Cundinamarca', lat: 4.3015, lng: -74.8058, zoom: 13 }
];

export const DEFAULT_COLOMBIA_CITY: CityCoordinate = COLOMBIA_CITIES[0]; // Bogotá

function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Busca las coordenadas de una ciudad colombiana por nombre (ignora mayúsculas y tildes).
 * Si no la encuentra o viene vacía, retorna Bogotá como fallback por defecto.
 */
export function getCityCoordinates(cityName?: string | null): CityCoordinate {
  if (!cityName || !cityName.trim()) {
    return DEFAULT_COLOMBIA_CITY;
  }

  const query = normalizeText(cityName);

  // 1. Coincidencia exacta
  const exact = COLOMBIA_CITIES.find(c => normalizeText(c.name) === query);
  if (exact) return exact;

  // 2. Coincidencia parcial (ej. "Bogota D.C." -> "Bogotá")
  const partial = COLOMBIA_CITIES.find(c => {
    const cityNorm = normalizeText(c.name);
    return query.includes(cityNorm) || cityNorm.includes(query);
  });
  if (partial) return partial;

  return DEFAULT_COLOMBIA_CITY;
}
