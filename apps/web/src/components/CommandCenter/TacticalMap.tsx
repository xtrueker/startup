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
        getFillColor: [244, 63, 94, 210],
        getLineColor: [255, 255, 255, 200],
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
        iconAtlas: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="%23181818" stroke="%233a3a3a" stroke-width="1.5"/><path d="M10 13h10l6-4.5v15l-6-4.5H10a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z" fill="%23efede3"/><circle cx="14" cy="17.5" r="2" fill="%23181818"/><circle cx="10" cy="10" r="1.5" fill="%2310b981"/></svg>',
        iconMapping: {
          camera: { x: 0, y: 0, width: 36, height: 36, mask: false }
        },
        getIcon: () => 'camera',
        getPosition: (d: any) => [d.lng, d.lat],
        getSize: () => 32,
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

  // Police units are tracked via real-time socket events (ghost:live_tracking)
  const [policeUnits] = useState<any[]>([]);

  const policeLayer = useMemo(() => {
    if (policeUnits.length === 0) return [];
    return [
      new IconLayer({
        id: 'police-units-layer',
        data: policeUnits,
        pickable: true,
        iconAtlas: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%23ffffff" stroke="%23000000" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        iconMapping: {
          shield: { x: 0, y: 0, width: 36, height: 36, mask: false }
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

  const selectedAlert = selectedAlertId ? activeAlerts[selectedAlertId] : null;

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', background: mapMode === 'operator' ? '#0a0a0a' : '#171717' }}>
      
      {/* View Mode Toggle */}
      <div className="absolute top-6 right-6 z-10 glass-panel rounded-xl p-1.5 flex gap-1 pointer-events-auto">
        <button 
          onClick={() => mapMode !== 'operator' && toggleMapMode()}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${mapMode === 'operator' ? 'bg-[#222222] text-[#efede3] font-bold border border-[#3a3a3a] shadow-sm' : 'text-[#8c8c8c] hover:text-[#efede3] hover:bg-[#181818]'}`}
        >
          Operador (3D)
        </button>
        <button 
          onClick={() => mapMode !== 'citizen' && toggleMapMode()}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${mapMode === 'citizen' ? 'bg-[#222222] text-[#efede3] font-bold border border-[#3a3a3a] shadow-sm' : 'text-[#8c8c8c] hover:text-[#efede3] hover:bg-[#181818]'}`}
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
              <div className="flex flex-col gap-2" style={{ minWidth: 210 }}>
                <div className="flex items-center justify-between gap-3 border-b border-[#2a2a2a] pb-1.5 pr-4">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#fb7185]">
                    <AlertTriangle size={13} className="text-[#fb7185]" /> SLA: Crítico
                  </span>
                  <span className="bg-[#881337]/40 text-[#fda4af] px-1.5 py-0.5 rounded text-[9px] uppercase font-mono font-bold border border-[#e11d48]/30">
                    {selectedAlert.status}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#efede3] leading-snug">
                  {selectedAlert.description || 'Emergencia reportada'}
                </p>
                <div className="text-[11px] text-[#a3a3a3] flex items-center gap-1.5 font-mono">
                  <MapPin size={11} className="text-[#737373] flex-shrink-0" />
                  <span className="truncate">{selectedAlert.sourceLocation.address || `${selectedAlert.sourceLocation.lat.toFixed(5)}, ${selectedAlert.sourceLocation.lng.toFixed(5)}`}</span>
                </div>
              </div>
            </Popup>
          )}
        </MapGL>
      </DeckGL>
    </div>
  );
};
