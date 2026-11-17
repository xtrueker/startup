/**
 * Utilidades para normalizar geometrías PostGIS (GeoJSON, WKT y EWKB Hexadecimal)
 * garantizando coordenadas numéricas exactas en iOS, Android y Web.
 */
export function parsePostgisPoint(
  raw: unknown
): { latitude: number; longitude: number } | null {
  if (!raw) return null;

  // 1. Objeto GeoJSON: { type: 'Point', coordinates: [lng, lat] } o { latitude, longitude }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, any>;
    if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
      const lng = Number(obj.coordinates[0]);
      const lat = Number(obj.coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    if (obj.latitude !== undefined && obj.longitude !== undefined) {
      const lat = Number(obj.latitude);
      const lng = Number(obj.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    return null;
  }

  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  // 2. Cadena WKT / EWKT: POINT(lng lat) o SRID=4326;POINT(lng lat)
  const wktMatch = trimmed.match(/POINT\s*\(\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s*\)/i);
  if (wktMatch) {
    const lng = parseFloat(wktMatch[1]);
    const lat = parseFloat(wktMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  // 3. Cadena PostGIS EWKB / WKB Hexadecimal (ej. 0101000020E6100000...)
  if (/^[0-9a-fA-F]{42,}$/.test(trimmed) && trimmed.length % 2 === 0) {
    try {
      const buf = Buffer.from(trimmed, 'hex');
      if (buf.length >= 21) {
        const littleEndian = buf[0] === 1;
        const geomType = littleEndian ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
        const hasSrid = (geomType & 0x20000000) !== 0;
        const offset = 5 + (hasSrid ? 4 : 0);
        if (buf.length >= offset + 16) {
          const lng = littleEndian
            ? buf.readDoubleLE(offset)
            : buf.readDoubleBE(offset);
          const lat = littleEndian
            ? buf.readDoubleLE(offset + 8)
            : buf.readDoubleBE(offset + 8);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return {
              latitude: Math.round(lat * 1e7) / 1e7,
              longitude: Math.round(lng * 1e7) / 1e7,
            };
          }
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function normalizePostgisLocationToWkt(raw: unknown): unknown {
  const parsed = parsePostgisPoint(raw);
  if (parsed) {
    return `POINT(${parsed.longitude} ${parsed.latitude})`;
  }
  return raw;
}
