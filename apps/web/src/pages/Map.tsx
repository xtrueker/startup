import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { cameraService } from '../services/cameras';
import type { Camera } from '../services/cameras';
import { alertService } from '../services/alerts';
import type { Alert, EscapeRoute } from '../services/alerts';
import { analysisService } from '../services/analysis';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSocket } from '../hooks/useSocket';
import { authService } from '../services/auth';
import CameraModal from '../components/CameraModal';
import CreateAlertModal from '../components/CreateAlertModal';
import CreateCameraModal from '../components/CreateCameraModal';
import UserLocationLayer from '../features/map/UserLocationLayer';
import CamerasLayer from '../features/map/CamerasLayer';
import AlertsLayer from '../features/map/AlertsLayer';
import HeatmapLayer from '../features/map/HeatmapLayer';
import 'leaflet/dist/leaflet.css';

const CENTER: [number, number] = [7.0653, -73.8548];





import { useMap } from 'react-leaflet';

// Sub-component to handle programmatic map movements
function MapController() {
  const map = useMap();
  useEffect(() => {
    const handleFlyToCamera = (e: any) => {
      const cam = e.detail;
      if (cam && cam.location) {
        map.flyTo([cam.location.latitude, cam.location.longitude], 18, { duration: 1.5 });
      }
    };
    const handleFlyToCoords = (e: any) => {
      const { lat, lng } = e.detail;
      if (lat && lng) map.flyTo([lat, lng], 17, { duration: 1.2 });
    };
    window.addEventListener('flyToCamera', handleFlyToCamera);
    window.addEventListener('flyToCoords', handleFlyToCoords);
    return () => {
      window.removeEventListener('flyToCamera', handleFlyToCamera);
      window.removeEventListener('flyToCoords', handleFlyToCoords);
    };
  }, [map]);
  return null;
}

// ─── Main Component ────────────────────────────────────────────────────────
function Map({ onLogout, isCommandCenter = false }: { onLogout: () => void, isCommandCenter?: boolean }) {
  const [cameras, setCameras] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time GPS
  const { position: userPos, error: gpsError, loading: gpsLoading } = useGeolocation({
    smoothingWindow: 5, updateIntervalMs: 5000
  });

  // UI state
  const [selectedCamera, setSelectedCamera] = useState<any>(null);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [showCreateCamera, setShowCreateCamera] = useState(false);

  // Analysis layers
  const [showHotspots, setShowHotspots] = useState(false);
  const [hotspotData, setHotspotData] = useState<number[][]>([]);

  const [reachabilityMode, setReachabilityMode] = useState<'off' | 'caminando' | 'bicicleta' | 'motocicleta' | 'vehiculo'>('off');
  const [reachabilityLayer, setReachabilityLayer] = useState<any | null>(null);
  const [reachabilityAlertId, setReachabilityAlertId] = useState<string | null>(null);
  const [reachabilityMins, setReachabilityMins] = useState(5);

  const { socket, connected } = useSocket();

  // Memoized: camera IDs near any escape route (avoids re-computing on unrelated re-renders)
  const cameraIdsNearRoutes = useMemo(() => {
    const ids = new Set<string>();
    alerts.forEach(alert => alert.escapeRoutes?.forEach((r: EscapeRoute) =>
      r.nearbyCameras?.forEach(id => ids.add(id))
    ));
    return ids;
  }, [alerts]);

  // GPS status badge label
  const gpsBadge = gpsLoading
    ? { label: 'Buscando GPS...', bg: '#805ad5' }
    : gpsError === 'permission_denied'
    ? { label: '⚠ GPS bloqueado', bg: '#e53e3e' }
    : gpsError
    ? { label: '⚠ GPS no disponible', bg: '#e53e3e' }
    : { label: `📍 ${userPos!.lat.toFixed(4)}, ${userPos!.lng.toFixed(4)}`, bg: '#276749' };



  // ─── Data loading ──────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      const [camerasData, alertsData] = await Promise.all([
        cameraService.getCameras(),
        alertService.getAlerts(),
      ]);
      setCameras(camerasData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ─── Real-Time WebSocket Listeners ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Cameras
    socket.on('camera:new', (newCamera) => {
      setCameras(prev => [...prev, newCamera]);
    });
    
    socket.on('camera:updated', (updatedCamera) => {
      setCameras(prev => prev.map(c => c.id === updatedCamera.id ? updatedCamera : c));
    });

    socket.on('camera:deleted', ({ id }) => {
      setCameras(prev => prev.filter(c => c.id !== id));
      setSelectedCamera((prev: Camera | null) => (prev?.id === id ? null : prev));
    });

    // Alerts
    socket.on('alert:new', (newAlert) => {
      setAlerts(prev => [newAlert, ...prev]);
    });

    socket.on('alert:deleted', ({ id }) => {
      setAlerts(prev => prev.filter(a => a.id !== id));
      if (reachabilityAlertId === id) setReachabilityLayer(null);
    });

    return () => {
      socket.off('camera:new');
      socket.off('camera:updated');
      socket.off('camera:deleted');
      socket.off('alert:new');
      socket.off('alert:deleted');
    };
  }, [socket, reachabilityAlertId]);

  // ─── Hotspots toggle ───────────────────────────────────────────────────
  const toggleHotspots = async () => {
    if (!showHotspots && hotspotData.length === 0) {
      try {
        const data = await analysisService.getHotspots();
        setHotspotData(data);
      } catch (e) {
        console.error('Error hotspots:', e);
      }
    }
    setShowHotspots(prev => !prev);
  };

  // ─── Reachability ──────────────────────────────────────────────────────
  const handleReachability = async (alert: Alert, mode: typeof reachabilityMode) => {

    // ... (rest of the code)
    if (mode === 'off') { setReachabilityLayer(null); setReachabilityAlertId(null); return; }
    try {
      const geojson = await analysisService.getReachability(
        alert.location.latitude, alert.location.longitude, mode, reachabilityMins
      );
      setReachabilityLayer(geojson);
      setReachabilityAlertId(alert.id);
    } catch (e) {
      console.error('Error reachability:', e);
    }
  };

  return (
    <div style={{ height:'100vh', width:'100vw', display:'flex', flexDirection:'column' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      {!isCommandCenter && (
      <header style={{
        background:'linear-gradient(135deg,#1a365d 0%,#2c5282 100%)',
        color:'white', padding:'0.75rem 1rem',
        display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.75rem'
      }}>
        <div style={{ flex:1, textAlign:'center' }}>
          <h1 style={{ margin:0, fontSize:'1.3rem' }}>🛡️ Red Ciudadana de Seguridad</h1>
          <p style={{ margin:'0.2rem 0 0', opacity:0.85, fontSize:'0.85rem' }}>
            {loading ? 'Cargando...' : `${cameras.length} cámaras · ${alerts.length} alertas activas`}
          </p>
        </div>

        {/* Socket connection badge */}
        <div style={{
          background: connected ? '#276749' : '#e53e3e',
          color: 'white', borderRadius: 6, padding: '3px 10px',
          fontSize: '0.75rem', whiteSpace: 'nowrap',
          fontFamily: 'monospace', flexShrink: 0
        }}>
          {connected ? '🟢 WS Conectado' : '🔴 WS Desconectado'}
        </div>

        {/* GPS badge */}
        <div style={{
          background: gpsBadge.bg, color:'white', borderRadius:6,
          padding:'3px 10px', fontSize:'0.75rem', whiteSpace:'nowrap',
          fontFamily:'monospace', flexShrink:0
        }}>
          {gpsBadge.label}
        </div>

        {/* Controls bar */}
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', justifyContent:'flex-end', alignItems:'center' }}>

          {/* Reachability time picker */}
          <select
            value={reachabilityMins}
            onChange={e => setReachabilityMins(+e.target.value)}
            style={{ padding:'0.35rem 0.5rem', borderRadius:6, border:'none', fontSize:'0.8rem' }}
          >
            {[2,5,10,15,20].map(m => <option key={m} value={m}>{m} min</option>)}
          </select>

          {/* Hotspots */}
          <button onClick={toggleHotspots} style={{
            background: showHotspots ? '#dd6b20' : 'rgba(255,255,255,0.18)',
            color:'white', border:'1px solid rgba(255,255,255,0.4)',
            padding:'0.4rem 0.75rem', borderRadius:6, cursor:'pointer', fontSize:'0.82rem'
          }}>
            🔥 {showHotspots ? 'Ocultar Zonas' : 'Zonas Calientes'}
          </button>

          {/* Command Center Access (Operator, Supervisor, Admin) */}
          {['admin', 'supervisor', 'operator'].includes(authService.getRole() || '') && (
            <button onClick={() => window.location.href = '/command-center'} style={{
              background: '#4a5568', color: 'white', border: '1px solid #718096',
              padding:'0.4rem 0.75rem', borderRadius:6, cursor:'pointer',
              fontSize:'0.82rem', fontWeight:'bold'
            }}>
              🖥️ Centro de Comando
            </button>
          )}

          {/* New Camera (Admin / Supervisor Only) */}
          {(authService.getRole() === 'admin' || authService.getRole() === 'supervisor') && (
            <button onClick={() => setShowCreateCamera(true)} style={{
              background:'#2c5282', color:'white', border:'1px solid #4299e1',
              padding:'0.4rem 0.75rem', borderRadius:6, cursor:'pointer',
              fontSize:'0.82rem', fontWeight:'bold'
            }}>
              📹 Agregar Cámara
            </button>
          )}

          {/* New Alert */}
          <button onClick={() => setShowCreateAlert(true)} style={{
            background:'#e53e3e', color:'white', border:'none',
            padding:'0.4rem 0.75rem', borderRadius:6, cursor:'pointer',
            fontSize:'0.82rem', fontWeight:'bold'
          }}>
            🚨 Reportar Alerta
          </button>

          {/* Logout */}
          <button onClick={onLogout} style={{
            background:'rgba(255,255,255,0.15)', color:'white',
            border:'1px solid white', padding:'0.4rem 0.75rem',
            borderRadius:6, cursor:'pointer', fontSize:'0.82rem'
          }}>
            Salir
          </button>
        </div>
      </header>
      )}

      {/* ── Map ────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, position:'relative' }}>
        <MapContainer center={CENTER} zoom={14} style={{ height:'100%', width:'100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* ── Extracted Layers ── */}
          <UserLocationLayer />
          
          {/* Heatmap (Func 12) */}
          {showHotspots && hotspotData.length > 0 && (
            <HeatmapLayer data={hotspotData} />
          )}
          
          <CamerasLayer 
            cameras={cameras} 
            cameraIdsNearRoutes={cameraIdsNearRoutes} 
            setSelectedCamera={setSelectedCamera} 
            setCameras={setCameras} 
          />

          <AlertsLayer
            alerts={alerts}
            setAlerts={setAlerts}
            reachabilityAlertId={reachabilityAlertId}
            setReachabilityAlertId={setReachabilityAlertId}
            reachabilityMode={reachabilityMode}
            setReachabilityMode={setReachabilityMode}
            reachabilityLayer={reachabilityLayer}
            setReachabilityLayer={setReachabilityLayer}
            handleReachability={handleReachability}
          />
          <MapController />
        </MapContainer>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div style={{
        background:'white', padding:'0.5rem 1rem',
        display:'flex', gap:'1.5rem', justifyContent:'center', flexWrap:'wrap',
        borderTop:'1px solid #e2e8f0', fontSize:'0.82rem'
      }}>
        <span>📹 Cámara ({cameras.length})</span>
        <span>📹🔴 Cámara con sospechoso</span>
        <span>🚨 Alerta activa ({alerts.length})</span>
        <span style={{ color:'#ff2222', fontWeight:'bold' }}>━ Ruta principal</span>
        <span style={{ color:'#ff8800' }}>━ Ruta secundaria</span>
        <span style={{ color:'#ddcc00' }}>─ Ruta alternativa</span>
        <span style={{ color:'#805ad5' }}>◉ Zona alcance</span>
        {showHotspots && <span style={{ color:'#dd6b20' }}>🔥 Zona caliente</span>}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {selectedCamera && (
        <CameraModal camera={selectedCamera} onClose={() => setSelectedCamera(null)} />
      )}

      {showCreateAlert && (
        <CreateAlertModal
          onClose={() => setShowCreateAlert(false)}
          onSuccess={() => { setShowCreateAlert(false); loadData(); }}
          initialPosition={userPos ? { lat: userPos.lat, lng: userPos.lng } : undefined}
        />
      )}

      {showCreateCamera && (
        <CreateCameraModal
          onClose={() => setShowCreateCamera(false)}
          onSuccess={() => { setShowCreateCamera(false); loadData(); }}
          initialPosition={userPos ? { lat: userPos.lat, lng: userPos.lng } : undefined}
        />
      )}

      {/* Pulse animation for camera highlight */}
      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(255,0,0,0.7); }
          70%  { box-shadow: 0 0 0 10px rgba(255,0,0,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,0,0,0); }
        }
        @keyframes gps-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(66,153,225,0.7); }
          70%  { box-shadow: 0 0 0 14px rgba(66,153,225,0); }
          100% { box-shadow: 0 0 0 0 rgba(66,153,225,0); }
        }
      `}</style>
    </div>
  );
}

export default Map;