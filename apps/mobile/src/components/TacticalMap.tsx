import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Circle, MapStyleElement } from 'react-native-maps';
import { palette } from '../theme/prismTheme';
import { PrismIcon } from './ui/PrismPrimitives';

export interface CameraItem {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface TacticalMapProps {
  mapRef?: React.RefObject<MapView | null>;
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

/**
 * Clean luminous Pearl & Silver-Ice map style for Android Google Maps
 * (iOS Apple Maps uses native userInterfaceStyle="light").
 */
const PEARL_LIGHT_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#F2F5F9' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#526071' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94A3B8' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#E8EEF5' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#E1F2EE' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#DCE4EE' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#F8FAFC' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#CBD5E1' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#CBE8F6' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#0284C7' }],
  },
];

export function TacticalMap({
  mapRef,
  initialRegion,
  userLocation,
  currentLocation,
  cameras,
  isAlertActive,
}: TacticalMapProps) {
  const internalRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const hasCenteredInitial = useRef(false);

  // Sincronizar ref externo con nuestro ref interno
  const setRefs = (instance: MapView | null) => {
    internalRef.current = instance;
    if (mapRef && 'current' in mapRef) {
      (mapRef as React.MutableRefObject<MapView | null>).current = instance;
    }
  };

  // Garantiza que en iOS y Android el mapa vuele a la ubicación real apenas MapView esté listo
  useEffect(() => {
    if (!mapReady || !internalRef.current) return;
    const lat = currentLocation?.lat ?? userLocation?.latitude;
    const lng = currentLocation?.lng ?? userLocation?.longitude;

    if (lat != null && lng != null && !hasCenteredInitial.current) {
      hasCenteredInitial.current = true;
      internalRef.current.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        750
      );
    }
  }, [mapReady, userLocation, currentLocation]);

  const activeLat = currentLocation?.lat ?? userLocation?.latitude;
  const activeLng = currentLocation?.lng ?? userLocation?.longitude;

  return (
    <MapView
      ref={setRefs}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      onMapReady={() => setMapReady(true)}
      showsUserLocation={true}
      showsMyLocationButton={false}
      showsCompass={false}
      showsScale={false}
      toolbarEnabled={false}
      scrollEnabled={true}
      zoomEnabled={true}
      pitchEnabled={true}
      rotateEnabled={true}
      userInterfaceStyle="light"
      mapType="standard"
      customMapStyle={Platform.OS === 'android' ? PEARL_LIGHT_MAP_STYLE : undefined}
    >
      {/* Cámaras comunitarias conectadas */}
      {cameras.map((camera) => (
        <Marker
          key={camera.id}
          coordinate={{
            latitude: camera.location.latitude,
            longitude: camera.location.longitude,
          }}
          title={camera.name}
          description="Cámara comunitaria conectada"
          tracksViewChanges={false}
        >
          <View style={styles.cameraMarker}>
            <PrismIcon name="camera" size={14} color={palette.aqua} />
          </View>
        </Marker>
      ))}

      {/* Perímetro de cobertura cuando hay una alerta SOS activa */}
      {isAlertActive && activeLat != null && activeLng != null && (
        <Circle
          center={{
            latitude: activeLat,
            longitude: activeLng,
          }}
          radius={220}
          strokeWidth={2}
          strokeColor="rgba(225, 29, 72, 0.72)"
          fillColor="rgba(225, 29, 72, 0.14)"
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  cameraMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
});
