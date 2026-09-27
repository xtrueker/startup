const MAPBOX_KEY = import.meta.env.VITE_ROUTING_API_KEY;

export const routingService = {
  /**
   * Obtiene la ruta ajustada a las calles usando OSRM (público) o Mapbox (si hay API Key).
   * Acepta un arreglo de múltiples waypoints.
   */
  async getSnappedRoute(waypoints: [number, number][]): Promise<[number, number][]> {
    if (waypoints.length < 2) return waypoints;

    const coordsStr = waypoints.map(p => `${p[0]},${p[1]}`).join(';');

    try {
      if (MAPBOX_KEY && MAPBOX_KEY.length > 5) {
        // Opción A: MAPBOX (Profesional)
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsStr}?geometries=geojson&access_token=${MAPBOX_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Mapbox API falló');
        const data = await res.json();
        return data.routes[0].geometry.coordinates as [number, number][];
      } else {
        // Opción B: OSRM PÚBLICO (OpenStreetMap - Sin Key)
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?geometries=geojson&overview=full`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM API falló');
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          throw new Error('OSRM no encontró ruta');
        }
        return data.routes[0].geometry.coordinates as [number, number][];
      }
    } catch (error) {
      console.warn('⚠️ Fallo en el servicio de enrutamiento espacial. Usando respaldo de @turf/turf (línea recta).', error);
      
      // Fallback seguro: devolver las líneas rectas entre waypoints
      return waypoints;
    }
  }
};
