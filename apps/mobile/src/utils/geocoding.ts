import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { config } from '../config';

/**
 * Geocodificación inversa multiplataforma unificada (iOS, Android y Web).
 * En nativo consulta primero el geocodificador del sistema operativo y cae en respaldo
 * a Nominatim OpenStreetMap si el proveedor nativo no devuelve calle legible.
 */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
  fallbackLabel = 'Ubicación GPS confirmada'
): Promise<string> {
  if (Platform.OS !== 'web') {
    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo) {
        const street = geo.street || geo.name || '';
        const district = geo.district || geo.subregion || '';
        const city = geo.city || '';
        const formatted = [street, district, city].filter(Boolean).join(', ');
        if (formatted) return formatted;
      }
    } catch {
      // Continúa hacia respaldo HTTP Nominatim
    }
  }

  try {
    const url = `${config.REVERSE_GEOCODE_URL}?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=es`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      const addr = data?.address;
      if (addr) {
        const parts = [
          addr.road || addr.pedestrian || addr.suburb,
          addr.neighbourhood || addr.city_district,
          addr.city || addr.town || addr.municipality,
        ].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    }
  } catch {
    // Respaldo silencioso cuando no hay conectividad externa
  }

  return fallbackLabel;
}
