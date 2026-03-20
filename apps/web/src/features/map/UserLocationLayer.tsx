import { useEffect, useRef } from 'react';
import { Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useGeolocation } from '../../hooks/useGeolocation';

// Pulsing blue dot for user's live position
export const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:rgba(66,153,225,0.9);
    border:3px solid white;
    box-shadow:0 0 0 0 rgba(66,153,225,0.7);
    animation:gps-pulse 2s ease-out infinite;
  "></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});

export function MapAutoCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const centeredRef = useRef(false);
  useEffect(() => {
    if (!centeredRef.current) {
      map.setView([lat, lng], 15, { animate: true });
      centeredRef.current = true;
    }
  }, [lat, lng, map]);
  return null;
}

export default function UserLocationLayer() {
  const { position: userPos } = useGeolocation({
    smoothingWindow: 5, updateIntervalMs: 5000
  });

  if (!userPos) return null;

  return (
    <>
      <MapAutoCenter lat={userPos.lat} lng={userPos.lng} />
      <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
        <Popup>
          <div style={{ minWidth: 130 }}>
            <strong>📍 Tu ubicación</strong><br />
            <small style={{ color: '#718096' }}>
              Precisión: ~{Math.round(userPos.accuracy)} m
            </small>
          </div>
        </Popup>
      </Marker>
      <Circle
        center={[userPos.lat, userPos.lng]}
        radius={userPos.accuracy}
        pathOptions={{ color: '#4299e1', weight: 1, opacity: 0.5, fillColor: '#4299e1', fillOpacity: 0.06 }}
      />
    </>
  );
}
