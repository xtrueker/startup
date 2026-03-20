import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

export default function HeatmapLayer({ data }: { data: number[][] }) {
  const map = useMap();
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const Lw = (window as any).L;
    if (!Lw || !Lw.heatLayer) {
      console.warn('leaflet.heat plugin not available');
      return;
    }
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }
    layerRef.current = Lw.heatLayer(data, {
      radius: 35,
      blur: 25,
      maxZoom: 17,
      gradient: { 0.2: '#0000ff', 0.5: '#ff8800', 0.8: '#ff0000' }
    }).addTo(map);
    return () => { if (layerRef.current) map.removeLayer(layerRef.current); };
  }, [data, map]);

  return null;
}
