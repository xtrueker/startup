import React, { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapGL } from 'react-map-gl/maplibre';
import { ScatterplotLayer, IconLayer, PathLayer } from '@deck.gl/layers';
import { MapPin, Satellite, MapPinned, Waypoints } from 'lucide-react';
import { useCommandStore } from '../../stores/useCommandStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { authService } from '../../services/auth';
import { getCityCoordinates } from '../../utils/colombiaCities';

import { useTacticalHeatmapLayer } from './TacticalHeatmapLayer';
import { routingService } from '../../services/routingService';
import { useThemeStore } from '../../stores/useThemeStore';
import { useSocket } from '../../hooks/useSocket';
import 'maplibre-gl/dist/maplibre-gl.css';

const TACTICAL_DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const TACTICAL_LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// 1. Pure Clean Satellite Style (Ultra-HD Google Earth: ZERO restaurants, ZERO locales, ZERO commercial clutter)
const SATELLITE_CLEAN_STYLE: any = {
  version: 8,
  sources: {
    'google-satellite': {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
      ],
      tileSize: 256,
      maxzoom: 22,
      attribution: '© Google Earth'
    }
  },
  layers: [
    {
      id: 'google-satellite-layer',
      type: 'raster',
      source: 'google-satellite',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 1,
        'raster-resampling': 'linear',
        'raster-fade-duration': 100
      }
    }
  ]
};

// 2. Clean Satellite with Road Names overlay (Zero POIs/businesses, only official Calle/Carrera street names)
const SATELLITE_WITH_ROADS_STYLE: any = {
  version: 8,
  sources: {
    'google-satellite': SATELLITE_CLEAN_STYLE.sources['google-satellite'],
    'clean-roads': {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 19
    }
  },
  layers: [
    SATELLITE_CLEAN_STYLE.layers[0],
    {
      id: 'clean-roads-layer',
      type: 'raster',
      source: 'clean-roads',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 0.85
      }
    }
  ]
};

export const TacticalMap: React.FC = () => {
  const theme = useThemeStore(state => state.theme);
  const user = useAuthStore(state => state.user);
  const userCiudad = user?.ciudad || authService.getCiudad();
  const cityConfig = useMemo(() => getCityCoordinates(userCiudad), [userCiudad]);

  const [mapType, setMapType] = useState<'tactical' | 'satellite'>('tactical');
  const [showCleanRoads, setShowCleanRoads] = useState(false);
  const [viewPerspective, setViewPerspective] = useState<'3d' | '2d'>('3d');

  const [viewState, setViewState] = useState(() => ({
    longitude: cityConfig.lng,
    latitude: cityConfig.lat,
    zoom: cityConfig.zoom,
    pitch: 55,
    bearing: 0
  }));

  const activeAlerts = useCommandStore(state => state.activeAlerts);
  const focusedAlertId = useCommandStore(s => s.focusedAlertId);
  const focusMapOnAlert = useCommandStore(s => s.focusMapOnAlert);

  const alertsList = useMemo(() => Object.values(activeAlerts), [activeAlerts]);

  // Centrar en la ciudad del usuario al iniciar sesión o cambiar de ciudad
  useEffect(() => {
    if (!focusedAlertId) {
      setViewState(prev => ({
        ...prev,
        longitude: cityConfig.lng,
        latitude: cityConfig.lat,
        zoom: cityConfig.zoom,
        transitionDuration: 1200
      }));
    }
  }, [cityConfig, focusedAlertId]);

  // Handle FlyTo cuando se selecciona una alerta específica
  useEffect(() => {
    if (focusedAlertId && activeAlerts[focusedAlertId]) {
      const loc = activeAlerts[focusedAlertId].sourceLocation;
      setViewState((prev: any) => ({
        ...prev,
        longitude: loc.lng,
        latitude: loc.lat,
        zoom: 16,
        pitch: viewPerspective === '3d' ? 55 : 0,
        transitionDuration: 1500
      }));
    }
  }, [focusedAlertId, activeAlerts, viewPerspective]);

  const handlePerspectiveChange = (perspective: '3d' | '2d') => {
    setViewPerspective(perspective);
    setViewState(prev => ({
      ...prev,
      pitch: perspective === '3d' ? 55 : 0,
      bearing: perspective === '3d' ? prev.bearing || 0 : 0,
      transitionDuration: 800
    }));
  };

  const heatmapLayers = useTacticalHeatmapLayer();

  const alertsLayer = useMemo(() => {
    if (alertsList.length === 0) return [];
    return [
      new IconLayer({
        id: 'tactical-alerts-layer',
        data: alertsList,
        pickable: true,
        // Lucide AlertTriangle icon paths (stroke-based, round caps)
        iconAtlas: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="%23450a0a" stroke="%23f43f5e" stroke-width="2"/><g transform="translate(16,14) scale(1.33)" stroke="%23fda4af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></g></svg>`,
        iconMapping: {
          alert: { x: 0, y: 0, width: 64, height: 64, mask: false }
        },
        getIcon: () => 'alert',
        getPosition: (d: any) => [d.sourceLocation.lng, d.sourceLocation.lat],
        getSize: () => 38,
        sizeScale: 1,
        onClick: ({ object }: any) => {
          if (object) {
            focusMapOnAlert(object.id);
          }
        },
        autoHighlight: false
      })
    ];
  }, [alertsList, focusMapOnAlert]);

  const ghostVictimsDict = useCommandStore(state => state.ghostVictims);
  const ghostVictims = useMemo(() => Object.values(ghostVictimsDict), [ghostVictimsDict]);
  const ghostLayer = useMemo(() => {
    if (ghostVictims.length === 0) return [];
    return [
      new ScatterplotLayer({
        id: 'ghost-victims-layer',
        data: ghostVictims,
        pickable: false,
        opacity: 1,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 15,
        radiusMaxPixels: 50,
        lineWidthMinPixels: 4,
        getPosition: (d: any) => [d.lng, d.lat],
        getRadius: 30,
        getFillColor: [200, 200, 200, 255], // Ghost Mode Monochrome
        getLineColor: [255, 255, 255, 200],
      })
    ];
  }, [ghostVictims]);

  const systemCameras = useCommandStore(state => state.systemCameras);
  const setSelectedCamera = useCommandStore(state => state.setSelectedCamera);
  const camerasLayer = useMemo(() => {
    if (!systemCameras || systemCameras.length === 0) return [];
    return [
      new IconLayer({
        id: 'system-cameras-layer',
        data: systemCameras,
        pickable: true,
        // Lucide Video icon paths (stroke-based, round caps) — darker blue palette
        iconAtlas: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="%230a1628" stroke="%231e40af" stroke-width="2"/><g transform="translate(10,10) scale(1.85)" stroke="%2393c5fd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="m22 8-6 4 6 4V8z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></g></svg>`,
        iconMapping: {
          camera: { x: 0, y: 0, width: 64, height: 64, mask: false }
        },
        getIcon: () => 'camera',
        getPosition: (d: any) => [d.lng, d.lat],
        getSize: () => 40,
        sizeScale: 1,
        autoHighlight: false,
        onClick: ({ object }: any) => {
          if (object) {
            setSelectedCamera(object);
          }
        },
        updateTriggers: {
          getPosition: [systemCameras]
        }
      })
    ];
  }, [systemCameras, setSelectedCamera]);

  // Police units are tracked via real-time socket events (patrol:location -> police:unit_moved)
  const { socket } = useSocket({ namespace: '/operators' });
  const [policeUnits, setPoliceUnits] = useState<any[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleUnitMoved = (unit: any) => {
      setPoliceUnits(prev => {
        const id = unit.officerId || unit.socketId || unit.id;
        const idx = prev.findIndex(p => (p.officerId || p.socketId || p.id) === id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...unit };
          return next;
        }
        return [...prev, unit];
      });
    };

    const handleUnitOffline = (data: any) => {
      setPoliceUnits(prev => prev.filter(p => (p.officerId || p.socketId || p.id) !== data.officerId));
    };

    const handleActiveUnits = (units: any[]) => {
      if (Array.isArray(units)) {
        setPoliceUnits(units);
      }
    };

    socket.on('police:unit_moved', handleUnitMoved);
    socket.on('police:unit_online', handleUnitMoved);
    socket.on('police:unit_offline', handleUnitOffline);
    socket.on('police:active_units', handleActiveUnits);

    return () => {
      socket.off('police:unit_moved', handleUnitMoved);
      socket.off('police:unit_online', handleUnitMoved);
      socket.off('police:unit_offline', handleUnitOffline);
      socket.off('police:active_units', handleActiveUnits);
    };
  }, [socket]);

  const policeLayer = useMemo(() => {
    if (policeUnits.length === 0) return [];
    
    // Atlas SVG con iconos de Siren (Policía) y Ambulance (Ambulancia)
    const TACTICAL_UNITS_ATLAS = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="48" viewBox="0 0 96 48">
  <g transform="translate(0, 0)">
    <circle cx="24" cy="24" r="21" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2.5"/>
    <path d="M19 24a5 5 0 0 1 5-5v0a5 5 0 0 1 5 5v6H19v-6z" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
    <path d="M17 32a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1H17v-1z" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
    <line x1="33" y1="24" x2="36" y2="24" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    <line x1="30" y1="17" x2="32" y2="15" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    <line x1="12" y1="24" x2="15" y2="24" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    <line x1="24" y1="13" x2="24" y2="15" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    <line x1="16" y1="17" x2="18" y2="18.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
  </g>
  <g transform="translate(48, 0)">
    <circle cx="24" cy="24" r="21" fill="#881337" stroke="#fb7185" stroke-width="2.5"/>
    <g stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M18 20h-4" stroke="#ef4444" stroke-width="2.5"/>
      <path d="M16 18v4" stroke="#ef4444" stroke-width="2.5"/>
      <path d="M33 27h1a1 1 0 0 0 1-1v-3a1 1 0 0 0-.293-.707L31.414 19H29V16a2 2 0 0 0-2-2H17a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h1"/>
      <circle cx="21" cy="27" r="2" fill="#ffffff"/>
      <path d="M23 27h6"/>
      <circle cx="31" cy="27" r="2" fill="#ffffff"/>
    </g>
  </g>
</svg>`.trim());

    return [
      new IconLayer({
        id: 'police-units-layer',
        data: policeUnits,
        pickable: true,
        iconAtlas: TACTICAL_UNITS_ATLAS,
        iconMapping: {
          siren: { x: 0, y: 0, width: 48, height: 48, mask: false },
          ambulance: { x: 48, y: 0, width: 48, height: 48, mask: false }
        },
        getIcon: (d: any) => {
          const isAmbulance = d.unitType === 'ambulance' || 
                              d.type === 'ambulance' || 
                              d.teamType === 'ambulancia' || 
                              (d.officerName && d.officerName.toLowerCase().includes('ambulanc'));
          return isAmbulance ? 'ambulance' : 'siren';
        },
        getPosition: (d: any) => [d.lng ?? d.longitude, d.lat ?? d.latitude],
        getSize: () => 44,
        sizeScale: 1,
        autoHighlight: true,
        transitions: {
          getPosition: {
            duration: 2000,
            easing: (t: number) => t
          }
        },
        updateTriggers: {
          getPosition: [policeUnits]
        }
      })
    ];
  }, [policeUnits]);



  // --- POST-EVENT TRAINING DRAWING LOGIC ---
  const isDrawingRoute = useCommandStore(state => state.isDrawingRoute);
  const escapeRouteWaypoints = useCommandStore(state => state.escapeRouteWaypoints);
  const escapeRoutePoints = useCommandStore(state => state.escapeRoutePoints);
  const addEscapeRouteWaypoint = useCommandStore(state => state.addEscapeRouteWaypoint);
  const setEscapeRoutePoints = useCommandStore(state => state.setEscapeRoutePoints);

  const handleMapClick = async (info: any, _event: any) => {
    if (isDrawingRoute && info.coordinate) {
      const newPoint = [info.coordinate[0], info.coordinate[1]] as [number, number];
      addEscapeRouteWaypoint(newPoint[0], newPoint[1]);
      
      const updatedWaypoints = [...escapeRouteWaypoints, newPoint];
      if (updatedWaypoints.length < 2) {
        setEscapeRoutePoints(updatedWaypoints);
      } else {
        try {
          const snappedPath = await routingService.getSnappedRoute(updatedWaypoints);
          setEscapeRoutePoints(snappedPath);
        } catch (err) {
          console.error('Error al generar la ruta ajustada:', err);
          setEscapeRoutePoints(updatedWaypoints);
        }
      }
    }
  };

  const trainingRouteLayer = useMemo(() => {
    if (escapeRoutePoints.length < 2) return [];
    return [
      new PathLayer({
        id: 'training-escape-route-layer',
        data: [{ path: escapeRoutePoints }],
        pickable: false,
        widthScale: 1,
        widthMinPixels: 4,
        getPath: d => d.path,
        getColor: [255, 255, 255, 255], // Monochrome route
        getWidth: 5
      })
    ];
  }, [escapeRoutePoints]);
  // -----------------------------------------

  const layers = [...heatmapLayers, ...camerasLayer, ...alertsLayer, ...ghostLayer, ...policeLayer, ...trainingRouteLayer];


  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', background: mapType === 'satellite' ? '#030803' : (viewPerspective === '3d' ? '#0a0a0a' : '#171717') }}>
      
      {/* Top Right Controls: Jurisdiction Card + Perspective (3D / 2D) */}
      <div className="absolute top-4 right-5 z-10 flex items-center gap-2 pointer-events-auto">
        {/* City Jurisdiction Button (Re-centers on Click) */}
        <button
          onClick={() => {
            setViewState(prev => ({
              ...prev,
              longitude: cityConfig.lng,
              latitude: cityConfig.lat,
              zoom: cityConfig.zoom,
              pitch: viewPerspective === '3d' ? 55 : 0,
              bearing: 0,
              transitionDuration: 1000
            }));
          }}
          title={`Clic para re-centrar el mapa en ${cityConfig.name}`}
          className="group bg-[var(--bg-surface)] rounded px-2.5 py-1.5 flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-left active:scale-[0.98]"
        >
          <div className="w-5 h-5 rounded bg-emerald-500/15 group-hover:bg-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 transition-colors flex-shrink-0 shadow-xs">
            <MapPin size={12} className="group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-mono text-[var(--text-muted)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 tracking-wider font-bold transition-colors flex items-center gap-1 leading-none mb-0.5">
              Jurisdicción
            </span>
            <span className="text-[11px] font-bold text-[var(--text-primary)] tracking-wide flex items-center gap-1 transition-colors leading-none">
              {cityConfig.name}
              <span className="text-[9px] font-normal text-[var(--text-muted)]">({cityConfig.department})</span>
            </span>
          </div>
        </button>

        {/* Perspective: Operador (3D) vs Ciudadano (2D) */}
        <div className="bg-[var(--bg-surface)] p-[3px] rounded flex gap-1 shadow-md">
          <button 
            onClick={() => handlePerspectiveChange('3d')}
            className={`px-2 py-1 text-[10px] font-bold transition-all cursor-pointer rounded ${
              viewPerspective === '3d' 
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs font-black' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
            title="Vista tridimensional con ángulo de inclinación 3D"
          >
            Operador (3D)
          </button>
          <button 
            onClick={() => handlePerspectiveChange('2d')}
            className={`px-2 py-1 text-[10px] font-bold transition-all cursor-pointer rounded ${
              viewPerspective === '2d' 
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs font-black' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
            title="Vista cenital plana 2D"
          >
            Ciudadano (2D)
          </button>
        </div>
      </div>

      {/* ── BOTONES CIRCULARES LATERALES DERECHOS (Compactos) ── */}
      <div className="absolute right-5 top-[7rem] z-10 flex flex-col gap-1.5 pointer-events-auto items-center">
        {/* Botón Circular 1: Alternar Modo Satelital / Táctico */}
        <button
          onClick={() => setMapType(mapType === 'satellite' ? 'tactical' : 'satellite')}
          className={`w-[35px] h-[35px] rounded-full flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer group relative ${
            mapType === 'satellite'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-105'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:shadow-lg'
          }`}
          title={mapType === 'satellite' ? 'Cambiar a Mapa Táctico' : 'Cambiar a Satélite (Real)'}
        >
          {mapType === 'satellite' ? (
            <Satellite size={15} className="text-white" />
          ) : (
            <MapPinned size={15} className="group-hover:text-[var(--brand)] transition-colors" />
          )}

          {/* Tooltip flotante hacia la izquierda */}
          <span className="absolute right-9 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 bg-[var(--bg-surface)] text-[var(--text-primary)] text-[10px] font-semibold py-0.5 px-2 rounded shadow-xl whitespace-nowrap">
            {mapType === 'satellite' ? 'Satélite Activo (Clic: Táctico)' : 'Activar Satélite (Real)'}
          </span>
        </button>

        {/* Botón Circular 2: Alternar Calles (ÚNICAMENTE si el mapa Satelital está activo) */}
        {mapType === 'satellite' && (
          <button
            onClick={() => setShowCleanRoads(!showCleanRoads)}
            className={`w-[35px] h-[35px] rounded-full flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer group relative animate-in fade-in zoom-in-95 duration-150 ${
              showCleanRoads
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:shadow-lg'
            }`}
            title={showCleanRoads ? 'Modo 100% Limpio (Ocultar calles)' : 'Mostrar nombres de calles'}
          >
            <Waypoints 
              size={15} 
              className={showCleanRoads ? 'text-white' : 'group-hover:text-blue-500 transition-colors'} 
            />

            {/* Tooltip flotante hacia la izquierda */}
            <span className="absolute right-9 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 bg-[var(--bg-surface)] text-[var(--text-primary)] text-[10px] font-semibold py-0.5 px-2 rounded shadow-xl whitespace-nowrap">
              {showCleanRoads ? 'Calles Activas (Clic: Limpio)' : 'Ver Calles'}
            </span>
          </button>
        )}
      </div>

      <DeckGL
        layers={layers}
        viewState={viewState}
        onViewStateChange={e => setViewState(e.viewState as any)}
        controller={{ dragRotate: viewPerspective === '3d' }}
        onClick={handleMapClick}
        getCursor={({ isHovering }) => (isDrawingRoute ? 'crosshair' : (isHovering ? 'pointer' : 'default'))}
      >
        <MapGL 
          mapStyle={
            mapType === 'satellite'
              ? (showCleanRoads ? SATELLITE_WITH_ROADS_STYLE : SATELLITE_CLEAN_STYLE)
              : (theme === 'light' ? TACTICAL_LIGHT_STYLE : TACTICAL_DARK_STYLE)
          } 
          reuseMaps
        />
      </DeckGL>
    </div>
  );
};
