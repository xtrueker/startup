import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useCommandStore } from '../../stores/useCommandStore';
import { AlertTriangle, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix para íconos defectuosos en React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

const criticalIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); animation: pulse 1.5s infinite;"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/**
 * COMPONENTE HIJO: Centralización del mapa sobre Alertas Focalizadas.
 * Evitamos re-dibujar todo el mapa táctico al volar hacia una alerta.
 */
const MapFlyToController = () => {
  const map = useMap();
  const focusedAlertId = useCommandStore(s => s.focusedAlertId);
  const alerts = useCommandStore(s => s.activeAlerts);

  useEffect(() => {
    if (focusedAlertId && alerts[focusedAlertId]) {
      const loc = alerts[focusedAlertId].sourceLocation;
      map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
    }
  }, [focusedAlertId, alerts, map]);

  return null;
};


export const TacticalMap: React.FC = () => {
  // Select específico: Si entra nuevo audio o el sidebar cambia, el mapa NO se re-renderiza.
  const activeAlerts = useCommandStore(state => state.activeAlerts);
  const resolveAlert = useCommandStore(state => state.resolveAlert);

  // Memoizamos el arreglo para React.memo en los childs
  const alertsList = useMemo(() => Object.values(activeAlerts), [activeAlerts]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[4.6097, -74.0817]} // Default LatLng (Bogotá)
        zoom={13}
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        zoomControl={false}
      >
        {/* Capa de Mapa Táctico Oscuro (Nighter) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />

        <MapFlyToController />

        {/* Renderizado O(1) Optimizado de Marcadores */}
        {alertsList.map((alert) => (
          <Marker
            key={alert.id}
            position={[alert.sourceLocation.lat, alert.sourceLocation.lng]}
            icon={criticalIcon}
          >
            <Popup className="tactical-popup">
              <div className="flex flex-col gap-2 p-1">
                <div className="flex items-center gap-2 text-red-500 font-bold">
                  <AlertTriangle size={18} /> EMERGENCIA
                </div>
                <p className="text-sm font-medium">{alert.description || 'Pánico Disparado'}</p>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={12} /> {alert.sourceLocation.address || 'GPS Sin resolver'}
                </div>
                <button 
                  onClick={() => resolveAlert(alert.id)}
                  className="mt-2 bg-slate-800 text-white text-xs py-1 rounded hover:bg-slate-700"
                >
                  Marcar Controlado
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Styles Globales (Omitimos Tailwind inline complexes por claridad JSX) */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .tactical-popup .leaflet-popup-content-wrapper {
          background-color: #1e293b;
          color: white;
          border-radius: 8px;
          border-left: 4px solid #ef4444;
        }
        .tactical-popup .leaflet-popup-tip {
          background-color: #1e293b;
        }
      `}</style>
    </div>
  );
};
