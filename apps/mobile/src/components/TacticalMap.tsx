import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';

export interface CameraItem {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface TacticalMapProps {
  mapRef?: React.RefObject<MapView>;
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
  mapRef,
  initialRegion,
  userLocation,
  currentLocation,
  cameras,
  isAlertActive,
}: TacticalMapProps) {
  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      showsUserLocation={true}
      showsMyLocationButton={false}
      showsCompass={false}
      userInterfaceStyle="dark"
      mapType="standard"
    >
      {/* Marcadores de Cámaras Ciudadanas Conectadas */}
      {cameras.map((camera) => (
        <Marker
          key={camera.id}
          coordinate={{
            latitude: camera.location.latitude,
            longitude: camera.location.longitude,
          }}
          title={camera.name}
          description="Cámara de Seguridad Ciudadana Conectada"
        >
          <View style={styles.cameraMarker}>
            <Text style={styles.cameraIcon}>📹</Text>
          </View>
        </Marker>
      ))}

      {/* Zona de Cobertura de Pánico */}
      {isAlertActive && (currentLocation || userLocation) && (
        <Circle
          center={{
            latitude: currentLocation?.lat || userLocation!.latitude,
            longitude: currentLocation?.lng || userLocation!.longitude,
          }}
          radius={200}
          strokeWidth={2}
          strokeColor="rgba(239, 68, 68, 0.9)"
          fillColor="rgba(239, 68, 68, 0.25)"
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  cameraMarker: {
    backgroundColor: 'rgba(14, 165, 233, 0.9)',
    padding: 6,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    elevation: 4,
  },
  cameraIcon: {
    fontSize: 14,
  },
});
