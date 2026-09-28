import React, { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapGL } from 'react-map-gl/maplibre';
import { ScatterplotLayer, IconLayer, PathLayer } from '@deck.gl/layers';
import { useCommandStore } from '../../stores/useCommandStore';

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
        autoHighlight: true,
        highlightColor: [255, 180, 180, 220]
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
        autoHighlight: true,
        highlightColor: [56, 189, 248, 220],
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
          mapStyle={mapMode === 'operator' ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"} 
          reuseMaps
        >
        </MapGL>
      </DeckGL>
    </div>
  );
};
