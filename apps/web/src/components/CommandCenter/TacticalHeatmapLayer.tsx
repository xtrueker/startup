import { useMemo } from 'react';
import { PathLayer } from '@deck.gl/layers';
import { useCommandStore } from '../../stores/useCommandStore';
import { exactRoutes } from './exactRoutes';

// Algoritmo de colorización de Riesgo Predictivo (Estilo Tráfico de Google Maps)
const getRiskColor = (risk: number, alpha: number): [number, number, number, number] => {
  if (risk >= 0.9) return [255, 40, 40, alpha];    // Rojo Sangre (Crítico)
  if (risk >= 0.7) return [255, 140, 0, alpha];    // Naranja (Peligro Alto)
  if (risk >= 0.5) return [255, 210, 40, alpha];   // Amarillo (Moderado)
  return [40, 200, 255, alpha];                    // Azul Cyan (Ruta Segura)
};

// Función de cálculo de distancia Haversine (en kilómetros)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a)); // Radio de la Tierra = 6371 km
};

export function useTacticalHeatmapLayer() {
  const heatmapEnabled = useCommandStore(s => s.heatmapEnabled);
  // FIX: Extraer el objeto dict completo para evitar que Zustand cree una nueva referencia (array) 
  // en cada ciclo, lo cual causa el Error: Maximum update depth exceeded.
  const activeAlertsDict = useCommandStore(s => s.activeAlerts);
  
  return useMemo(() => {
    if (!heatmapEnabled) return [];

    const activeAlerts = Object.values(activeAlertsDict);

    // Motor Predictivo Dinámico: Ajusta el riesgo de la ruta basado en alertas activas
    const dynamicRoutes = exactRoutes.map(route => {
      let currentRisk = route.risk; // Riesgo base histórico (ej. Caracas siempre es 0.9)
      
      activeAlerts.forEach(alert => {
        const alertLat = alert.sourceLocation.lat;
        const alertLng = alert.sourceLocation.lng;
        
        // Encontrar el punto de la ruta más cercano a la alerta
        let minDistance = Infinity;
        route.path.forEach(pt => {
          // pt[0] es lng, pt[1] es lat
          const d = calculateDistance(alertLat, alertLng, pt[1], pt[0]);
          if (d < minDistance) minDistance = d;
        });
        
        // Si hay una alerta a menos de 500 metros (0.5 km) de esta ruta, dispara el riesgo
        if (minDistance < 0.5) {
          if (alert.status === 'pending') currentRisk = Math.max(currentRisk, 0.99);      // Emergencia viva -> Rojo Sangre
          else if (alert.status === 'reviewing') currentRisk = Math.max(currentRisk, 0.85); // En revisión -> Naranja
          else currentRisk = Math.max(currentRisk, 0.75);
        }
      });

      return { ...route, risk: currentRisk };
    });

    return [
      // Capa 1: El "Glow" o Aura de la Ruta (Fondo difuminado de Google Maps)
      new PathLayer({
        id: 'predictive-routes-glow',
        data: dynamicRoutes,
        pickable: false,
        widthScale: 1,
        widthMinPixels: 12,
        widthMaxPixels: 24,
        getPath: (d: any) => d.path,
        getColor: (d: any) => getRiskColor(d.risk, 80), // 80 de opacidad (Aura)
        getWidth: 15,
        rounded: true,
        jointRounded: true,
        capRounded: true,
      }),
      
      // Capa 2: El Núcleo Sólido de la Ruta (Línea central intensa)
      new PathLayer({
        id: 'predictive-routes-core',
        data: dynamicRoutes,
        pickable: true,
        widthScale: 1,
        widthMinPixels: 4,
        widthMaxPixels: 8,
        getPath: (d: any) => d.path,
        getColor: (d: any) => getRiskColor(d.risk, 255), // Sólido al 100%
        getWidth: 5,
        rounded: true,
        jointRounded: true,
        capRounded: true,
      })
    ];
  }, [heatmapEnabled, activeAlertsDict]);
}
