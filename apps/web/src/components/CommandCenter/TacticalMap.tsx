import React, { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapGL, Popup } from 'react-map-gl/maplibre';
import { ScatterplotLayer, IconLayer, PathLayer } from '@deck.gl/layers';
import { useCommandStore } from '../../stores/useCommandStore';
import { AlertTriangle, MapPin } from 'lucide-react';
import { useTacticalHeatmapLayer } from './TacticalHeatmapLayer';
import { routingService } from '../../services/routingService';
import 'maplibre-gl/dist/maplibre-gl.css';

const INITIAL_VIEW_STATE = {
  longitude: -74.0817,
  latitude: 4.6097,
  zoom: 13,
  pitch: 55,
  bearing: 0
};

export const TacticalMap: React.FC = () => {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const activeAlerts = useCommandStore(state => state.activeAlerts);
  const focusedAlertId = useCommandStore(s => s.focusedAlertId);
  const focusMapOnAlert = useCommandStore(s => s.focusMapOnAlert);

  const [mapMode, setMapMode] = useState<'operator' | 'citizen'>('operator');

  const alertsList = useMemo(() => Object.values(activeAlerts), [activeAlerts]);

  // Handle FlyTo
  useEffect(() => {
    if (focusedAlertId && activeAlerts[focusedAlertId]) {
      const loc = activeAlerts[focusedAlertId].sourceLocation;
      setViewState((prev: any) => ({
        ...prev,
        longitude: loc.lng,
        latitude: loc.lat,
        zoom: 16,
        pitch: mapMode === 'operator' ? 55 : 0,
        transitionDuration: 1500
      }));
      setSelectedAlertId(focusedAlertId);
    }
  }, [focusedAlertId, activeAlerts, mapMode]);

  const toggleMapMode = () => {
    const newMode = mapMode === 'operator' ? 'citizen' : 'operator';
    setMapMode(newMode);
    setViewState(prev => ({
      ...prev,
      pitch: newMode === 'operator' ? 55 : 0,
      bearing: newMode === 'operator' ? 0 : 0
    }));
  };

  const heatmapLayers = useTacticalHeatmapLayer();

  const alertsLayer = useMemo(() => {
    if (alertsList.length === 0) return [];
    return [
      new ScatterplotLayer({
        id: 'tactical-alerts-layer',
        data: alertsList,
        pickable: true,
        opacity: 0.9,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 12,
        radiusMaxPixels: 40,
        lineWidthMinPixels: 3,
        getPosition: (d: any) => [d.sourceLocation.lng, d.sourceLocation.lat],
        getRadius: 20,
        getFillColor: [239, 68, 68, 220],
        getLineColor: [255, 255, 255, 255],
        onClick: ({ object }: any) => {
          if (object) {
            setSelectedAlertId(object.id);
            focusMapOnAlert(object.id); // Directamente abre la barra lateral
          }
        },
        autoHighlight: true,
        highlightColor: [255, 200, 200, 200]
      })
    ];
  }, [alertsList]);

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
        getFillColor: [147, 51, 234, 255], // Purple for Ghost Mode
        getLineColor: [255, 255, 255, 255],
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
        iconAtlas: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%233b82f6" stroke="%23ffffff" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
        iconMapping: {
          camera: { x: 0, y: 0, width: 24, height: 24, mask: false }
        },
        getIcon: () => 'camera',
        getPosition: (d: any) => [d.lng, d.lat],
        getSize: () => 36,
        sizeScale: 1,
        autoHighlight: true,
        highlightColor: [200, 220, 255, 220],
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

  // --- POLICE TRACKING SIMULATOR ---
  const [policeUnits, setPoliceUnits] = useState<any[]>([]);

  useEffect(() => {
    // Inicializar 3 patrullas cerca del centro
    const initialUnits = Array.from({ length: 3 }).map((_, i) => ({
      id: `police-${i}`,
      lat: 4.6097 + (Math.random() - 0.5) * 0.03,
      lng: -74.0817 + (Math.random() - 0.5) * 0.03,
      name: `Patrulla P-${i + 1}`
    }));
    setPoliceUnits(initialUnits);

    const interval = setInterval(() => {
      setPoliceUnits(prev => prev.map(unit => {
        // Mover lentamente hacia una dirección aleatoria (simulando patrullaje)
        return {
          ...unit,
          lat: unit.lat + (Math.random() - 0.5) * 0.001,
          lng: unit.lng + (Math.random() - 0.5) * 0.001
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const policeLayer = useMemo(() => {
    if (policeUnits.length === 0) return [];
    return [
      new IconLayer({
        id: 'police-units-layer',
        data: policeUnits,
        pickable: true,
        // Un ícono SVG de escudo azul para la policía
        iconAtlas: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%231e3a8a" stroke="%2360a5fa" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        iconMapping: {
          shield: { x: 0, y: 0, width: 24, height: 24, mask: false }
        },
        getIcon: () => 'shield',
        getPosition: (d: any) => [d.lng, d.lat],
        getSize: () => 40,
        sizeScale: 1,
        autoHighlight: true,
        highlightColor: [200, 220, 255, 220],
        transitions: {
          getPosition: {
            duration: 3000,
            easing: (t: number) => t // linear
          }
        },
        updateTriggers: {
          getPosition: [policeUnits] // Crucial para la animación fluida en DeckGL
        }
      })
    ];
  }, [policeUnits]);
  // ---------------------------------

  // --- POST-EVENT TRAINING DRAWING LOGIC ---
  const isDrawingRoute = useCommandStore(state => state.isDrawingRoute);
  const escapeRouteWaypoints = useCommandStore(state => state.escapeRouteWaypoints);
  const escapeRoutePoints = useCommandStore(state => state.escapeRoutePoints);
  const addEscapeRouteWaypoint = useCommandStore(state => state.addEscapeRouteWaypoint);
  const setEscapeRoutePoints = useCommandStore(state => state.setEscapeRoutePoints);

  const handleMapClick = async (info: any, event: any) => {
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
        getColor: [99, 102, 241, 255], // Indigo color
        getWidth: 5
      })
    ];
  }, [escapeRoutePoints]);
  // -----------------------------------------

  const layers = [...heatmapLayers, ...camerasLayer, ...alertsLayer, ...ghostLayer, ...policeLayer, ...trainingRouteLayer];

  const selectedAlert = selectedAlertId ? activeAlerts[selectedAlertId] : null;

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', background: mapMode === 'operator' ? '#0f172a' : '#f8fafc' }}>
      
      {/* View Mode Toggle */}
      <div className="absolute top-6 right-6 z-10 glass-panel rounded-xl p-1.5 flex gap-1 pointer-events-auto">
        <button 
          onClick={() => mapMode !== 'operator' && toggleMapMode()}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${mapMode === 'operator' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
        >
          Operador (3D)
        </button>
        <button 
          onClick={() => mapMode !== 'citizen' && toggleMapMode()}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${mapMode === 'citizen' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
        >
          Ciudadano (2D)
        </button>
      </div>

      <DeckGL
        layers={mapMode === 'operator' ? layers : [...camerasLayer, ...alertsLayer, ...ghostLayer, ...policeLayer, ...trainingRouteLayer]}
        viewState={viewState}
        onViewStateChange={e => setViewState(e.viewState as any)}
        controller={{ dragRotate: mapMode === 'operator' }}
        onClick={handleMapClick}
        getCursor={({ isHovering }) => (isDrawingRoute ? 'crosshair' : (isHovering ? 'pointer' : 'default'))}
      >
        <MapGL 
          mapStyle={mapMode === 'operator' ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"} 
          reuseMaps
        >
          {selectedAlert && (
            <Popup
              longitude={selectedAlert.sourceLocation.lng}
              latitude={selectedAlert.sourceLocation.lat}
              closeOnClick={false}
              onClose={() => setSelectedAlertId(null)}
              anchor="bottom"
              style={{ zIndex: 100 }}
            >
              <div className="flex flex-col gap-2 p-1" style={{ color: '#1a202c', minWidth: 220 }}>
                <div className="flex items-center justify-between gap-2 text-red-600 font-bold border-b pb-1">
                  <span className="flex items-center gap-1"><AlertTriangle size={16} /> SLA: Crítico</span>
                  <span className="bg-red-100 px-1 rounded text-[10px] uppercase">{selectedAlert.status}</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{selectedAlert.description || 'Pánico Disparado'}</p>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={12} /> {selectedAlert.sourceLocation.address || 'GPS Sin resolver'}
                </div>
              </div>
            </Popup>
          )}
        </MapGL>
      </DeckGL>
    </div>
  );
};
