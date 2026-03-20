import { create } from 'zustand';

// Define Domain Types for the Real-time Emergency stream
export interface Location { lat: number; lng: number; address?: string; }
export interface EmergencyAlert {
  id: string;
  timestamp: string;
  sourceLocation: Location;
  status: 'critical' | 'resolved' | 'escalated';
  userId: string;
  description?: string;
}

interface CommandCenterState {
  // Estado Crítico (Entidades Dict para acceso O(1))
  activeAlerts: Record<string, EmergencyAlert>;
  focusedAlertId: string | null;
  heatmapEnabled: boolean;
  
  // Streaming Audio Queue por Alerta
  audioChunks: Record<string, string[]>; // alertId -> array de S3 URLs

  // Actions Mutadoras (Zustand)
  injectAlert: (alert: EmergencyAlert) => void;
  resolveAlert: (id: string) => void;
  focusMapOnAlert: (id: string) => void;
  toggleHeatmap: () => void;
  pushAudioChunk: (alertId: string, audioUrl: string) => void;
  popAudioChunk: (alertId: string) => string | undefined;
}

export const useCommandStore = create<CommandCenterState>((set) => ({
  activeAlerts: {},
  focusedAlertId: null,
  heatmapEnabled: false,
  audioChunks: {},

  injectAlert: (alert) => set((state) => ({
    activeAlerts: { ...state.activeAlerts, [alert.id]: alert }
  })),

  resolveAlert: (id) => set((state) => {
    const nextAlerts = { ...state.activeAlerts };
    delete nextAlerts[id];
    return { activeAlerts: nextAlerts };
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
  }
}));
