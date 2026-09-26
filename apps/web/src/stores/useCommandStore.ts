import { create } from 'zustand';

// Define Domain Types for the Real-time Emergency stream
export interface Location { lat: number; lng: number; address?: string; }
export interface EmergencyAlert {
  id: string;
  timestamp: string;
  sourceLocation: Location;
  status: 'critical' | 'resolved' | 'escalated' | 'pending' | 'reviewing' | 'verified';
  userId: string;
  description?: string;
  type?: string;
}

// ─── GHOST MODE TYPES ────────────────────────────────────────────────────────
export interface CitizenCamera {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rtspUrl: string;
}

export interface GhostVictim {
  userId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

interface CommandCenterState {
  // Estado Crítico (Entidades Dict para acceso O(1))
  activeAlerts: Record<string, EmergencyAlert>;
  focusedAlertId: string | null;
  heatmapEnabled: boolean;
  
  // Tactical Filters
  filterSeverity: string;
  filterTime: string;
  filterType: string;
  
  // Historical Replay
  isReplayMode: boolean;
  replayTimestamp: number | null;
  
  // Streaming Audio Queue por Alerta
  audioChunks: Record<string, string[]>; // alertId -> array de S3 URLs

  // ─── Ghost Mode Tracking ───
  ghostVictims: Record<string, GhostVictim>;
  predictiveCameras: CitizenCamera[];
  
  // ─── Map Assets ───
  systemCameras: CitizenCamera[];
  selectedCamera: CitizenCamera | null;

  // Actions Mutadoras (Zustand)
  injectAlert: (alert: EmergencyAlert) => void;
  resolveAlert: (id: string) => void;
  updateAlertStatus: (id: string, status: string) => void;
  focusMapOnAlert: (id: string | null) => void;
  toggleHeatmap: () => void;
  pushAudioChunk: (alertId: string, audioUrl: string) => void;
  popAudioChunk: (alertId: string) => string | undefined;
  
  // ─── Ghost Mode Actions ───
  updateGhostLocation: (victim: GhostVictim) => void;
  setPredictiveCameras: (cameras: CitizenCamera[]) => void;
  clearGhostData: (userId: string) => void;
  
  setSystemCameras: (cameras: CitizenCamera[]) => void;
  setSelectedCamera: (camera: CitizenCamera | null) => void;

  // Setters for new UX
  setFilters: (filters: { severity?: string; time?: string; type?: string }) => void;
  setReplayMode: (active: boolean, timestamp?: number) => void;

  // ─── Post-Event Training Route ───
  isDrawingRoute: boolean;
  escapeRouteWaypoints: [number, number][]; // Actual user clicks
  escapeRoutePoints: [number, number][]; // Full detailed OSRM path
  setDrawingRoute: (active: boolean) => void;
  addEscapeRouteWaypoint: (lng: number, lat: number) => void;
  setEscapeRoutePoints: (points: [number, number][]) => void;
  undoLastWaypoint: () => void;
  clearEscapeRoute: () => void;
}

export const useCommandStore = create<CommandCenterState>((set) => ({
  activeAlerts: {},
  focusedAlertId: null,
  heatmapEnabled: false,
  filterSeverity: 'all',
  filterTime: 'all',
  filterType: 'all',
  isReplayMode: false,
  replayTimestamp: null,
  audioChunks: {},
  
  ghostVictims: {},
  predictiveCameras: [],
  systemCameras: [],
  selectedCamera: null,

  isDrawingRoute: false,
  escapeRouteWaypoints: [],
  escapeRoutePoints: [],
  setDrawingRoute: (active) => set({ isDrawingRoute: active }),
  addEscapeRouteWaypoint: (lng, lat) => set((state) => ({ escapeRouteWaypoints: [...state.escapeRouteWaypoints, [lng, lat]] })),
  setEscapeRoutePoints: (points) => set({ escapeRoutePoints: points }),
  undoLastWaypoint: () => set((state) => {
    const newWaypoints = state.escapeRouteWaypoints.slice(0, -1);
    return { escapeRouteWaypoints: newWaypoints };
  }),
  clearEscapeRoute: () => set({ escapeRouteWaypoints: [], escapeRoutePoints: [], isDrawingRoute: false }),

  updateGhostLocation: (victim) => set((state) => ({
    ghostVictims: { ...state.ghostVictims, [victim.userId]: victim }
  })),

  setPredictiveCameras: (cameras) => set({ predictiveCameras: cameras }),
  
  setSystemCameras: (cameras) => set({ systemCameras: cameras }),
  setSelectedCamera: (camera) => set({ selectedCamera: camera }),

  clearGhostData: (userId) => set((state) => {
    const nextVictims = { ...state.ghostVictims };
    delete nextVictims[userId];
    return { ghostVictims: nextVictims, predictiveCameras: [] };
  }),

  injectAlert: (alert) => set((state) => ({
    activeAlerts: { ...state.activeAlerts, [alert.id]: alert }
  })),

  resolveAlert: (id) => set((state) => {
    const nextAlerts = { ...state.activeAlerts };
    delete nextAlerts[id];
    return { activeAlerts: nextAlerts };
  }),

  updateAlertStatus: (id, status) => set((state) => {
    // Si la alerta se resolvió o descartó, la purgamos del mapa activo
    if (status === 'resolved' || status === 'discarded') {
      const nextAlerts = { ...state.activeAlerts };
      delete nextAlerts[id];
      // Si la alerta purgada es la que estaba enfocada, cerramos el asistente
      return { 
        activeAlerts: nextAlerts,
        focusedAlertId: state.focusedAlertId === id ? null : state.focusedAlertId
      };
    }

    const alert = state.activeAlerts[id];
    if (!alert) return state;
    return {
      activeAlerts: {
        ...state.activeAlerts,
        [id]: { ...alert, status: status as any }
      }
    };
  }),

  focusMapOnAlert: (id) => set({ focusedAlertId: id }),

  toggleHeatmap: () => set((state) => ({ heatmapEnabled: !state.heatmapEnabled })),

  pushAudioChunk: (alertId, audioUrl) => set((state) => {
    const currentQueue = state.audioChunks[alertId] || [];
    return {
      audioChunks: { ...state.audioChunks, [alertId]: [...currentQueue, audioUrl] }
    };
  }),

  popAudioChunk: (alertId) => {
    let shiftedUrl: string | undefined;
    set((state) => {
      const currentQueue = state.audioChunks[alertId] || [];
      if (currentQueue.length === 0) return state;
      
      shiftedUrl = currentQueue[0];
      return {
        audioChunks: { ...state.audioChunks, [alertId]: currentQueue.slice(1) }
      };
    });
    return shiftedUrl;
  },

  setFilters: (filters) => set((state) => ({
    filterSeverity: filters.severity ?? state.filterSeverity,
    filterTime: filters.time ?? state.filterTime,
    filterType: filters.type ?? state.filterType,
  })),

  setReplayMode: (active, timestamp) => set({
    isReplayMode: active,
    replayTimestamp: timestamp ?? null
  })
}));
