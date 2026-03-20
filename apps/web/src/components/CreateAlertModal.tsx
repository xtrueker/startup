import React, { useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { alertService } from '../services/alerts';
import { authService } from '../services/auth';

const DEFAULT_CENTER: [number, number] = [7.0653, -73.8548];

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});



// ─── Compass Rose drag widget ─────────────────────────────────────────────
const COMPASS_LABELS: { label: string; angle: number; emoji: string }[] = [
  { label: 'N',  angle: 0,   emoji: '↑' },
  { label: 'NE', angle: 45,  emoji: '↗' },
  { label: 'E',  angle: 90,  emoji: '→' },
  { label: 'SE', angle: 135, emoji: '↘' },
  { label: 'S',  angle: 180, emoji: '↓' },
  { label: 'SO', angle: 225, emoji: '↙' },
  { label: 'O',  angle: 270, emoji: '←' },
  { label: 'NO', angle: 315, emoji: '↖' },
];

const COMPASS_MAP: Record<number, string> = {
  0: 'norte', 45: 'noreste', 90: 'este', 135: 'sureste',
  180: 'sur', 225: 'suroeste', 270: 'oeste', 315: 'noroeste',
};

function CompassWidget({
  value, onChange
}: { value: string; onChange: (dir: string) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const [angle, setAngle] = useState<number | null>(null);

  const SIZE = 160;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 58; // ring radius for dots

  // Find arrow angle for the current value
  const valueAngle = COMPASS_LABELS.find(c => COMPASS_MAP[c.angle] === value)?.angle ?? 0;
  const arrowDisplay = angle ?? valueAngle;

  function getAngleFromEvent(e: React.PointerEvent | PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - CX;
    const y = e.clientY - rect.top - CY;
    if (Math.sqrt(x * x + y * y) < 8) return null; // too close to center
    const raw = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    return raw;
  }

  function snapToNearest(raw: number) {
    const options = COMPASS_LABELS.map(c => c.angle);
    // Convert from canvas angle (0=East) to bearing (0=North)
    const bearing = ((raw - 90) + 360) % 360;
    let best = options[0];
    let bestDiff = 360;
    for (const opt of options) {
      const diff = Math.min(Math.abs(opt - bearing), 360 - Math.abs(opt - bearing));
      if (diff < bestDiff) { bestDiff = diff; best = opt; }
    }
    return { bearing: best, raw: ((best + 90) % 360) };
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const raw = getAngleFromEvent(e);
    if (raw !== null) {
      const snapped = snapToNearest(raw);
      setAngle(snapped.raw);
      onChange(COMPASS_MAP[snapped.bearing]);
    }
  }, [onChange]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const raw = getAngleFromEvent(e);
    if (raw !== null) {
      const snapped = snapToNearest(raw);
      setAngle(snapped.raw);
      onChange(COMPASS_MAP[snapped.bearing]);
    }
  }, [dragging, onChange]);

  const onPointerUp = useCallback(() => { setDragging(false); }, []);

  // Arrow tip coordinates from center
  const arrowRad = (arrowDisplay * Math.PI) / 180;
  const AX = CX + Math.cos(arrowRad) * 48;
  const AY = CY + Math.sin(arrowRad) * 48;

  const currentLabel = COMPASS_LABELS.find(c => COMPASS_MAP[c.angle] === value);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{
        background:'#1a202c', borderRadius:'50%', padding:4,
        boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect:'none', touchAction:'none',
      }}>
        <svg
          ref={svgRef}
          width={SIZE} height={SIZE}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ display:'block' }}
        >
          {/* Background ring */}
          <circle cx={CX} cy={CY} r={R+10} fill="#2d3748" />
          <circle cx={CX} cy={CY} r={R-10} fill="#1a202c" />

          {/* Compass dots */}
          {COMPASS_LABELS.map(({ label, angle: a }) => {
            const rad = ((a + 90) * Math.PI) / 180; // +90 → 0° = North in SVG coords (0°East)
            const x = CX + Math.cos(rad * 0 + ((a - 90) * Math.PI / 180)) * R;
            const y = CY + Math.sin(((a - 90) * Math.PI / 180)) * R;
            const isActive = COMPASS_MAP[a] === value;
            return (
              <g key={label}>
                <circle cx={x} cy={y} r={isActive ? 9 : 6}
                  fill={isActive ? '#fc8181' : '#4a5568'} />
                <text x={x} y={y+1} textAnchor="middle" dominantBaseline="middle"
                  fontSize={isActive ? 8 : 7} fill={isActive ? 'white' : '#a0aec0'}
                  style={{ pointerEvents:'none', fontWeight:'bold' }}>
                  {label}
                </text>
              </g>
            );
          })}

          {/* Arrow */}
          <line
            x1={CX} y1={CY} x2={AX} y2={AY}
            stroke="#fc8181" strokeWidth={3} strokeLinecap="round"
          />
          {/* Arrowhead */}
          <polygon
            points={`${AX},${AY}`}
            fill="#fc8181"
          />
          <circle cx={AX} cy={AY} r={5} fill="#f56565" stroke="white" strokeWidth={1.5} />

          {/* Center dot */}
          <circle cx={CX} cy={CY} r={5} fill="#e53e3e" />
        </svg>
      </div>
      <div style={{
        background:'#e53e3e', color:'white', borderRadius:20,
        padding:'4px 16px', fontSize:'0.9rem', fontWeight:'bold',
        letterSpacing: 1, boxShadow:'0 2px 8px rgba(229,62,62,0.4)'
      }}>
        {currentLabel?.emoji} {value.toUpperCase()}
      </div>
      <p style={{ margin:0, fontSize:'0.75rem', color:'#718096', textAlign:'center' }}>
        Arrastra o toca para indicar la dirección
      </p>
    </div>
  );
}

// ─── Map picker sub-component ─────────────────────────────────────────────
function LocationPicker({
  position, setPosition
}: { position: L.LatLng | null; setPosition: (v: L.LatLng) => void }) {
  useMapEvents({ click: (e) => setPosition(e.latlng) });
  return position ? <Marker position={position} icon={pinIcon} /> : null;
}

// ─── Main Modal ──────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialPosition?: { lat: number; lng: number }; // Pre-filled from GPS
}

export default function CreateAlertModal({ onClose, onSuccess, initialPosition }: Props) {
  const [step, setStep]         = useState<1 | 2>(1);
  const [type, setType]         = useState('emergency');
  const [description, setDesc]  = useState('');
  const [direction, setDir]     = useState('norte');
  // Pre-fill from GPS if available
  const [position, setPosition] = useState<L.LatLng | null>(
    initialPosition ? new L.LatLng(initialPosition.lat, initialPosition.lng) : null
  );
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const usingGPS = Boolean(initialPosition && position);;

  const isRobo = type === 'robo';

  const handleNext = () => {
    if (!position) { setError('Marca la ubicación del incidente en el mapa.'); return; }
    setError('');
    if (isRobo) setStep(2); else handleSubmit();
  };

  const handleSubmit = async () => {
    if (!position) return;
    const userId = authService.getUserId() || '65a28243e78466b957962d07';
    try {
      setLoading(true);
      setError('');
      await alertService.createAlert({
        userId,
        type: type as any,
        description,
        latitude: position.lat,
        longitude: position.lng,
        address: 'Ubicación seleccionada',
        direction: isRobo ? direction : undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear la alerta');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.65)',
      zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center',
      backdropFilter:'blur(2px)'
    }}>
      <div style={{
        background:'white', borderRadius:12, width:'min(560px,94vw)',
        maxHeight:'92vh', overflowY:'auto',
        boxShadow:'0 20px 60px rgba(0,0,0,0.4)'
      }}>
        {/* ── Header */}
        <div style={{
          background:'linear-gradient(135deg,#c53030,#e53e3e)',
          padding:'1rem 1.25rem', borderRadius:'12px 12px 0 0',
          display:'flex', justifyContent:'space-between', alignItems:'center'
        }}>
          <div>
            <h2 style={{ margin:0, color:'white', fontSize:'1.15rem' }}>
              🚨 Reportar Alerta
            </h2>
            {isRobo && (
              <div style={{ color:'rgba(255,255,255,0.8)', fontSize:'0.78rem', marginTop:2 }}>
                Paso {step} de 2 — {step === 1 ? 'Ubicación' : 'Dirección de escape'}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.2)', border:'none', color:'white',
            borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:'1rem'
          }}>✕</button>
        </div>

        {/* ── Error */}
        {error && (
          <div style={{ background:'#fff5f5', color:'#c53030', padding:'0.6rem 1.25rem',
            borderBottom:'1px solid #fed7d7', fontSize:'0.85rem' }}>
            ⚠ {error}
          </div>
        )}

        {/* ─────── STEP 1: type + map ───────────────────────────────────── */}
        {step === 1 && (
          <div style={{ padding:'1.25rem' }}>
            {/* GPS pre-fill banner */}
            {usingGPS && (
              <div style={{ background:'#ebf8ff', border:'1px solid #bee3f8', borderRadius:6,
                padding:'6px 10px', marginBottom:12, fontSize:'0.8rem', color:'#2c5282' }}>
                📍 Usando tu ubicación GPS actual. Puedes mover el pin si el incidente ocurrió en otro lugar.
              </div>
            )}

            {/* Type */}
            <label style={{ display:'block', fontWeight:700, marginBottom:6, fontSize:'0.88rem' }}>
              Tipo de Alerta
            </label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
              {[
                { v:'emergency', e:'🚨', l:'Emergencia' },
                { v:'robo',      e:'🔫', l:'Robo' },
                { v:'suspicious',e:'👁', l:'Sospechoso' },
                { v:'medical',   e:'🏥', l:'Médica' },
                { v:'fire',      e:'🔥', l:'Incendio' },
              ].map(({ v, e, l }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setType(v)}
                  style={{
                    padding:'10px 8px', borderRadius:8, cursor:'pointer',
                    border: type === v ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                    background: type === v ? '#fff5f5' : 'white',
                    color: type === v ? '#c53030' : '#4a5568',
                    fontWeight: type === v ? 700 : 400,
                    fontSize:'0.85rem', transition:'all 0.15s'
                  }}
                >
                  {e} {l}
                </button>
              ))}
            </div>

            {/* Map */}
            <label style={{ display:'block', fontWeight:700, marginBottom:6, fontSize:'0.88rem' }}>
              📍 Ubicación del incidente
              <span style={{ fontWeight:400, color:'#718096', marginLeft:6, fontSize:'0.78rem' }}>
                Toca el mapa para colocar el marcador
              </span>
            </label>
            <div style={{ height:260, borderRadius:8, overflow:'hidden',
              border: position ? '2px solid #e53e3e' : '2px dashed #cbd5e0' }}>
              <MapContainer center={DEFAULT_CENTER} zoom={14} style={{ height:'100%', width:'100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <LocationPicker position={position} setPosition={setPosition} />
              </MapContainer>
            </div>
            {position && (
              <div style={{ fontSize:'0.78rem', color:'#718096', marginTop:4 }}>
                ✓ {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              </div>
            )}

            {/* Description */}
            <div style={{ marginTop:16 }}>
              <label style={{ display:'block', fontWeight:700, marginBottom:6, fontSize:'0.88rem' }}>
                Descripción <span style={{ fontWeight:400, color:'#a0aec0' }}>(opcional)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDesc(e.target.value)}
                rows={2}
                placeholder="Ej: Sujeto en moto, casco negro..."
                style={{ width:'100%', padding:'0.5rem', borderRadius:6,
                  border:'1px solid #cbd5e0', fontSize:'0.85rem', resize:'vertical', boxSizing:'border-box' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
              <button onClick={onClose} style={{
                padding:'10px 20px', borderRadius:8, border:'1px solid #cbd5e0',
                background:'white', cursor:'pointer', fontSize:'0.88rem'
              }}>Cancelar</button>
              <button
                onClick={handleNext}
                disabled={!position || loading}
                style={{
                  padding:'10px 24px', borderRadius:8, border:'none',
                  background: !position ? '#cbd5e0' : '#e53e3e',
                  color:'white', fontWeight:700, cursor: !position ? 'default' : 'pointer',
                  fontSize:'0.88rem'
                }}
              >
                {isRobo ? 'Siguiente →' : (loading ? 'Enviando...' : 'Reportar Alerta')}
              </button>
            </div>
          </div>
        )}

        {/* ─────── STEP 2: Direction picker (Robo only) ─────────────────── */}
        {step === 2 && (
          <div style={{ padding:'1.25rem' }}>
            <div style={{ textAlign:'center', marginBottom:8 }}>
              <h3 style={{ margin:'0 0 4px', fontSize:'1rem', color:'#2d3748' }}>
                ¿Hacia dónde huyó el sospechoso?
              </h3>
              <p style={{ margin:0, color:'#718096', fontSize:'0.82rem' }}>
                Arrastra la rosa de vientos o toca una dirección
              </p>
            </div>

            {/* Compass widget */}
            <div style={{ display:'flex', justifyContent:'center', padding:'16px 0' }}>
              <CompassWidget value={direction} onChange={setDir} />
            </div>

            {/* Quick-tap 8 directions as text fallback */}
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginTop:8
            }}>
              {COMPASS_LABELS.map(({ label, angle: a }) => {
                const dir = COMPASS_MAP[a];
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setDir(dir)}
                    style={{
                      padding:'6px 2px', borderRadius:6, cursor:'pointer',
                      border: direction === dir ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                      background: direction === dir ? '#fff5f5' : 'white',
                      color: direction === dir ? '#c53030' : '#4a5568',
                      fontSize:'0.78rem', fontWeight: direction === dir ? 700 : 400,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:8, marginTop:20, justifyContent:'space-between' }}>
              <button onClick={() => setStep(1)} style={{
                padding:'10px 20px', borderRadius:8, border:'1px solid #cbd5e0',
                background:'white', cursor:'pointer', fontSize:'0.88rem'
              }}>← Volver</button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  padding:'10px 28px', borderRadius:8, border:'none',
                  background:'#e53e3e', color:'white', fontWeight:700,
                  cursor:'pointer', fontSize:'0.88rem', opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Calculando rutas...' : '🔫 Confirmar y Calcular Rutas'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
