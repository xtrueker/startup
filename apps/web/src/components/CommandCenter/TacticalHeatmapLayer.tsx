import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat'; // Requiere 'leaflet.heat' en package.json y @types/leaflet.heat
import { useCommandStore } from '../../stores/useCommandStore';

export const TacticalHeatmapLayer: React.FC = () => {
  const map = useMap();
  const heatmapEnabled = useCommandStore(s => s.heatmapEnabled);

  useEffect(() => {
    if (!heatmapEnabled) return;

    // Simulación de puntos calientes traídos del SpatialRoutingWorker (Redis/MongoDB)
    // Coordenadas: [Lat, Lng, Intensidad]
    const addressPoints: [number, number, number][] = [
      [4.6097, -74.0817, 0.8],
      [4.6110, -74.0820, 1.0],
      [4.6080, -74.0800, 0.6],
      [4.6150, -74.0900, 0.9],
    ];

    // L.heatLayer viene inyectado globalmente al prototipo L por 'leaflet.heat'
    const heatLayer = (L as any).heatLayer(addressPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 15,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, heatmapEnabled]);

  return null; // Componente renderless, interactúa directamente con el DOM del Canvas de Leaflet
};
