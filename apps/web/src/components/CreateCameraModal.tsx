import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { cameraService } from '../services/cameras';
import { authService } from '../services/auth';

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">📹</div>',
  iconSize: [28, 28], iconAnchor: [14, 14],
});

const PROTOCOLS = ['rtsp', 'rtmp', 'http', 'https', 'hls'];
const STATUS_OPTS = ['online', 'offline', 'maintenance'];

function LocationPicker({
  position, setPosition
}: { position: L.LatLng | null; setPosition: (v: L.LatLng) => void }) {
  useMapEvents({ click: (e) => setPosition(e.latlng) });
  return position ? <Marker position={position} icon={pinIcon} /> : null;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialPosition?: { lat: number; lng: number };
}

export default function CreateCameraModal({ onClose, onSuccess, initialPosition }: Props) {
  const defaultCenter: [number, number] = initialPosition
    ? [initialPosition.lat, initialPosition.lng]
    : [7.0653, -73.8548];

  const [position, setPosition] = useState<L.LatLng | null>(
    initialPosition ? new L.LatLng(initialPosition.lat, initialPosition.lng) : null
  );
  const [name, setName]           = useState('');
  const [ip, setIp]               = useState('');
  const [port, setPort]           = useState('554');
  const [protocol, setProtocol]   = useState('rtsp');
  const [streamPath, setPath]     = useState('');
  const [description, setDesc]    = useState('');
  const [coverageRadius, setCoverage] = useState(100);
  const [status, setStatus]       = useState('online');
  const [isPublic, setPublic]     = useState(true);

  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Auto-build streamUrl from IP, port, protocol, path
  const streamUrl = ip
    ? `${protocol}://${ip}:${port}${streamPath ? '/' + streamPath.replace(/^\//, '') : ''}`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!position) { setError('Selecciona la ubicación de la cámara en el mapa.'); return; }
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!ip.trim()) { setError('La dirección IP es obligatoria.'); return; }

    const authorityId = authService.getUserId() || '65a28243e78466b957962d07';
    try {
      setLoading(true);
      setError('');
      await cameraService.createCamera({
        name: name.trim(),
        latitude: position.lat,
        longitude: position.lng,
        address: `${ip} — ${description || name}`,
        streamUrl: streamUrl || `http://localhost:8888/${name.toLowerCase().replace(/\s+/g, '-')}`,
        coverageRadius,
        isPublic,
        authorityId,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear la cámara');
      setLoading(false);
    }
  };

  const usingGPS = Boolean(initialPosition && position);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        background: 'white', borderRadius: 12, width: 'min(580px,95vw)',
        maxHeight: '93vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#1a365d,#2c5282)',
          padding: '1rem 1.25rem', borderRadius: '12px 12px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>
            📹 Agregar Cámara de Seguridad
          </h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '1rem',
          }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fff5f5', color: '#c53030', padding: '0.6rem 1.25rem',
            borderBottom: '1px solid #fed7d7', fontSize: '0.85rem' }}>⚠ {error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* GPS banner */}
          {usingGPS && (
            <div style={{ background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: 6,
              padding: '6px 10px', fontSize: '0.8rem', color: '#2c5282' }}>
              📍 Usando tu ubicación GPS. Puedes mover el pin si la cámara está en otro lugar.
            </div>
          )}

          {/* Name */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: 4, fontSize: '0.88rem' }}>
              Nombre de la cámara *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Cámara Entrada Principal"
              style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #cbd5e0', fontSize: '0.88rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* IP + Protocol + Port */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 4, fontSize: '0.88rem' }}>
                Dirección IP *
              </label>
              <input
                value={ip}
                onChange={e => setIp(e.target.value)}
                placeholder="192.168.1.100"
                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #cbd5e0', fontSize: '0.88rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 4, fontSize: '0.88rem' }}>Protocolo</label>
              <select value={protocol} onChange={e => setProtocol(e.target.value)}
                style={{ padding: '0.5rem 6px', borderRadius: 6, border: '1px solid #cbd5e0', fontSize: '0.88rem' }}>
                {PROTOCOLS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            <div style={{ width: 80 }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 4, fontSize: '0.88rem' }}>Puerto</label>
              <input
                value={port}
                onChange={e => setPort(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #cbd5e0', fontSize: '0.88rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Stream path */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: 4, fontSize: '0.88rem' }}>
              Ruta del stream
              <span style={{ fontWeight: 400, color: '#a0aec0', marginLeft: 6, fontSize: '0.78rem' }}>(opcional)</span>
            </label>
            <input
              value={streamPath}
              onChange={e => setPath(e.target.value)}
              placeholder="camara1  →  se añade al final de IP:puerto"
              style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #cbd5e0', fontSize: '0.88rem', boxSizing: 'border-box' }}
            />
            {streamUrl && (
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#4a5568', fontFamily: 'monospace',
                background: '#edf2f7', padding: '4px 8px', borderRadius: 4 }}>
                🔗 {streamUrl}
              </p>
            )}
          </div>

          {/* Coverage + Status + Public — 3 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 4, fontSize: '0.88rem' }}>
                Cobertura (m)
              </label>
              <input
                type="number" min={10} max={2000}
                value={coverageRadius}
                onChange={e => setCoverage(+e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #cbd5e0', fontSize: '0.88rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: 4, fontSize: '0.88rem' }}>Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #cbd5e0', fontSize: '0.88rem' }}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700 }}>
                <input type="checkbox" checked={isPublic} onChange={e => setPublic(e.target.checked)} />
                Pública
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: 4, fontSize: '0.88rem' }}>
              Descripción <span style={{ fontWeight: 400, color: '#a0aec0', fontSize: '0.78rem' }}>(opcional)</span>
            </label>
            <textarea
              value={description} onChange={e => setDesc(e.target.value)}
              rows={2} placeholder="Ej: Cámara con visión nocturna, apunta hacia la entrada..."
              style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #cbd5e0', fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {/* Map */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: 4, fontSize: '0.88rem' }}>
              📍 Ubicación en el mapa *
              <span style={{ fontWeight: 400, color: '#718096', marginLeft: 6, fontSize: '0.78rem' }}>Toca para colocar</span>
            </label>
            <div style={{ height: 220, borderRadius: 8, overflow: 'hidden',
              border: position ? '2px solid #2c5282' : '2px dashed #cbd5e0' }}>
              <MapContainer center={defaultCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <LocationPicker position={position} setPosition={setPosition} />
              </MapContainer>
            </div>
            {position && (
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#718096' }}>
                ✓ {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              padding: '10px 20px', borderRadius: 8, border: '1px solid #cbd5e0',
              background: 'white', cursor: 'pointer', fontSize: '0.88rem',
            }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{
              padding: '10px 26px', borderRadius: 8, border: 'none',
              background: loading ? '#a0aec0' : '#2c5282',
              color: 'white', fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontSize: '0.88rem',
            }}>
              {loading ? 'Guardando...' : '📹 Guardar Cámara'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
