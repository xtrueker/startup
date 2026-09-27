import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export interface CameraItem {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface TacticalMapProps {
  mapRef?: any;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  userLocation: { latitude: number; longitude: number } | null;
  currentLocation: { lat: number; lng: number } | null;
  cameras: CameraItem[];
  isAlertActive: boolean;
}

export function TacticalMap({
  userLocation,
  currentLocation,
  cameras,
  isAlertActive,
}: TacticalMapProps) {
  const activeLat = currentLocation?.lat || userLocation?.latitude || 4.6097;
  const activeLng = currentLocation?.lng || userLocation?.longitude || -74.0817;

  return (
    <View style={styles.webContainer}>
      {/* Cuadrícula táctica radar de fondo */}
      <View style={styles.radarGrid}>
        <View style={styles.circleOuter} />
        <View style={styles.circleMid} />
        <View style={styles.circleInner} />
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
      </View>

      {/* Pin central del usuario */}
      <View style={styles.userPinContainer}>
        <View style={[styles.userPulse, isAlertActive && styles.userPulseAlert]} />
        <View style={[styles.userDot, isAlertActive && styles.userDotAlert]} />
        <Text style={styles.userLabel}>
          📍 TÚ ({activeLat.toFixed(4)}, {activeLng.toFixed(4)})
        </Text>
      </View>

      {/* Cámaras renderizadas como nodos tácticos */}
      <View style={styles.camerasOverlay}>
        {cameras.slice(0, 4).map((cam, idx) => {
          // Dispersión decorativa en cuadrantes para vista web
          const offsets = [
            { top: '30%', left: '25%' },
            { top: '28%', right: '25%' },
            { bottom: '35%', left: '28%' },
            { bottom: '32%', right: '28%' },
          ];
          const pos = offsets[idx % offsets.length];

          return (
            <View key={cam.id} style={[styles.cameraNode, pos as any]}>
              <Text style={styles.cameraIcon}>📹</Text>
              <Text style={styles.cameraText} numberOfLines={1}>
                {cam.name}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Badge Web Simulator */}
      <View style={styles.simulatorBadge}>
        <Text style={styles.simulatorText}>RADAR TÁCTICO WEB ACTIVO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#070A12',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  radarGrid: {
    position: 'absolute',
    width: 600,
    height: 600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleOuter: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.1)',
  },
  circleMid: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
  },
  circleInner: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  crosshairH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  crosshairV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },

  userPinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  userPulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  userPulseAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
  },
  userDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#38BDF8',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userDotAlert: {
    backgroundColor: '#EF4444',
  },
  userLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  camerasOverlay: {
    ...StyleSheet.absoluteFill,
  },
  cameraNode: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  cameraIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  cameraText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 100,
  },

  simulatorBadge: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  simulatorText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
