import React from 'react';
import { Marker, Popup, Circle } from 'react-leaflet';
import MarkerClusterGroup from '../../components/MarkerClusterGroup';
import L from 'leaflet';
import { cameraService } from '../../services/cameras';
import type { Camera } from '../../services/cameras';
import { authService } from '../../services/auth';

const cameraIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="font-size:22px;background:white;border-radius:50%;padding:2px;box-shadow:0 2px 6px rgba(0,0,0,0.35);">📹</div>',
  iconSize: [30, 30], iconAnchor: [15, 15],
});

const cameraHighlightIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="font-size:22px;background:#ff4444;border-radius:50%;padding:2px;box-shadow:0 2px 12px rgba(255,0,0,0.7);animation:pulse 1s infinite;">📹</div>',
  iconSize: [34, 34], iconAnchor: [17, 17],
});

interface CamerasLayerProps {
  cameras: Camera[];
  cameraIdsNearRoutes: Set<string>;
  setSelectedCamera: (camera: Camera) => void;
  setCameras: React.Dispatch<React.SetStateAction<Camera[]>>;
}

export default function CamerasLayer({ cameras, cameraIdsNearRoutes, setSelectedCamera, setCameras }: CamerasLayerProps) {
  const handleDeleteCamera = async (id: string) => {
    if (!window.confirm('¿Eliminar esta cámara del sistema?')) return;
    try {
      await cameraService.deleteCamera(id);
      setCameras(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error eliminando cámara:', err);
    }
  };

  return (
    <MarkerClusterGroup maxClusterRadius={40}>
      {cameras.map((camera) => (
        <Marker
          key={camera.id}
          position={[camera.location.latitude, camera.location.longitude]}
          icon={cameraIdsNearRoutes.has(camera.id) ? cameraHighlightIcon : cameraIcon}
          eventHandlers={{ click: () => setSelectedCamera(camera) }}
        >
          <Popup>
            <div style={{ minWidth: 140 }}>
              <strong>📹 {camera.name}</strong>
              {cameraIdsNearRoutes.has(camera.id) && (
                <div style={{ color: 'red', fontSize: '0.8rem', marginTop: 4 }}>
                  ⚠️ Posiblemente captó al sospechoso
                </div>
              )}
              <br />
              {camera.location.address}
              <br />
              <div style={{ display: 'flex', gap: 4, marginTop: '0.5rem' }}>
                <button
                  onClick={() => setSelectedCamera(camera)}
                  style={{ flex: 1, padding: '0.3rem', background: '#667eea', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
                >▶ Ver</button>
                {(authService.getRole() === 'admin' || authService.getRole() === 'supervisor') && (
                  <button
                    onClick={() => handleDeleteCamera(camera.id)}
                    style={{ flex: 1, padding: '0.3rem', background: '#e53e3e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
                  >🗑️ Eliminar</button>
                )}
              </div>
            </div>
          </Popup>
          <Circle
            center={[camera.location.latitude, camera.location.longitude]}
            radius={camera.coverageRadius || 100}
            pathOptions={{ color: '#4299e1', weight: 1, opacity: 0.4, fillOpacity: 0.05 }}
          />
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}
