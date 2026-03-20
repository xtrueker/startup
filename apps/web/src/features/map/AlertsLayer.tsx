import React from 'react';
import { Marker, Popup, GeoJSON } from 'react-leaflet';
import MarkerClusterGroup from '../../components/MarkerClusterGroup';
import L from 'leaflet';
import { alertService } from '../../services/alerts';
import type { Alert, EscapeRoute } from '../../services/alerts';
import { authService } from '../../services/auth';

const alertIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🚨</div>',
  iconSize: [32, 32], iconAnchor: [16, 16],
});

function routeStyle(priority: string): L.PathOptions {
  if (priority === 'high')   return { color: '#ff2222', weight: 6, opacity: 0.95, dashArray: undefined };
  if (priority === 'medium') return { color: '#ff8800', weight: 4, opacity: 0.65 };
  return                            { color: '#ffdd00', weight: 3, opacity: 0.40 };
}

interface AlertsLayerProps {
  alerts: Alert[];
  setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
  reachabilityAlertId: string | null;
  setReachabilityAlertId: React.Dispatch<React.SetStateAction<string | null>>;
  reachabilityMode: 'off' | 'caminando' | 'bicicleta' | 'motocicleta' | 'vehiculo';
  setReachabilityMode: React.Dispatch<React.SetStateAction<'off' | 'caminando' | 'bicicleta' | 'motocicleta' | 'vehiculo'>>;
  reachabilityLayer: any | null;
  setReachabilityLayer: React.Dispatch<React.SetStateAction<any | null>>;
  handleReachability: (alert: Alert, mode: 'off' | 'caminando' | 'bicicleta' | 'motocicleta' | 'vehiculo') => Promise<void>;
}

export default function AlertsLayer({
  alerts, setAlerts,
  reachabilityAlertId, reachabilityMode, setReachabilityMode,
  reachabilityLayer, setReachabilityLayer, handleReachability
}: AlertsLayerProps) {

  const handleDeleteAlert = async (id: string) => {
    try {
      await alertService.deleteAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      if (reachabilityAlertId === id) setReachabilityLayer(null);
    } catch (err) {
      console.error('Error eliminando alerta:', err);
    }
  };

  return (
    <>
      <MarkerClusterGroup maxClusterRadius={40}>
      {alerts.map((alert) => (
        <React.Fragment key={alert.id}>
          <Marker
            position={[alert.location.latitude, alert.location.longitude]}
            icon={alertIcon}
          >
            <Popup minWidth={200}>
              <div>
                <strong style={{ fontSize: '1rem' }}>
                  {alert.type === 'robo' ? '🔫' : '🚨'} Alerta: {alert.type}
                </strong>
                <br /><small>{new Date(alert.createdAt).toLocaleString()}</small>
                {(alert as any).source === 'mobile' && (
                  <span style={{ background: '#3182ce', color: 'white', borderRadius: 4, padding: '1px 8px', fontSize: '0.7rem', marginLeft: 6 }}>📱 MÓVIL</span>
                )}
                {alert.location.address && <><br />{alert.location.address}</>}
                {alert.description && <><br /><em>{alert.description}</em></>}
                {alert.direction && <><br />Dirección de escape: <strong>{alert.direction}</strong></>}

                {/* Reachability controls (Func 10) */}
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                  <strong style={{ fontSize: '0.8rem' }}>📍 Zona de alcance:</strong>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    {(['off', 'caminando', 'bicicleta', 'motocicleta', 'vehiculo'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => { setReachabilityMode(m); handleReachability(alert, m); }}
                        style={{
                          padding: '2px 6px', fontSize: '0.72rem', borderRadius: 4, cursor: 'pointer',
                          background: reachabilityAlertId === alert.id && reachabilityMode === m ? '#6b46c1' : '#f7fafc',
                          color: reachabilityAlertId === alert.id && reachabilityMode === m ? 'white' : '#2d3748',
                          border: '1px solid #cbd5e0'
                        }}
                      >
                        {m === 'off' ? '✖ Quitar' : m}
                      </button>
                    ))}
                  </div>
                </div>

                {(['admin', 'supervisor', 'operator'].includes(authService.getRole() || '')) && (
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    style={{
                      marginTop: '0.6rem', width: '100%', padding: '0.3rem',
                      background: '#e53e3e', color: 'white', border: 'none',
                      borderRadius: 4, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 'bold'
                    }}
                  >
                    ✅ Resolver / Eliminar Alerta
                  </button>
                )}
              </div>
            </Popup>
          </Marker>

          {/* Escape routes */}
          {alert.escapeRoutes?.map((route: EscapeRoute, idx: number) => (
             <GeoJSON
               key={`${alert.id}-route-${idx}`}
               data={route.geometry}
               style={routeStyle(route.priority)}
             />
          ))}
        </React.Fragment>
      ))}
      </MarkerClusterGroup>

      {/* Reachability zone (Func 10) */}
      {reachabilityLayer && (
        <GeoJSON
          key={`reachability-${reachabilityAlertId || 'default'}`}
          data={reachabilityLayer}
          style={{
            color: '#805ad5', weight: 2, opacity: 0.7,
            fillColor: '#d6bcfa', fillOpacity: 0.25
          }}
        />
      )}
    </>
  );
}
