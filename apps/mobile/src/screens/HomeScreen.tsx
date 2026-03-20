import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Vibration, Platform, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { api, authService } from '../services/auth';
import { useLocationStreaming } from '../hooks/useLocationStreaming';
import { useCameras } from '../hooks/useCameras';

const { width, height } = Dimensions.get('window');

// 📍 Coordenadas base (Ajustar a la ciudad destino de la Red Ciudadana)
const INITIAL_REGION = {
  latitude: 4.6097, // Bogotá, Colombia (ejemplo local)
  longitude: -74.0817,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  
  // Estados de Emergencia
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'active' | 'cancelling'>('idle');
  const [loading, setLoading] = useState(false);

  // Ubicación inicial del mapa (solo para enfocar antes del Pánico)
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);

  // Hooks de contexto geoespacial
  const { currentLocation } = useLocationStreaming({ alertId: activeAlertId });
  const { cameras, fetchCameras } = useCameras();

  // 1. Efecto inicial: Obtener permisos, ubicar en mapa y buscar cámaras
  useEffect(() => {
    (async () => {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus === 'granted') {
        const lastLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation(lastLoc.coords);
        
        // Centrar cámara silenciosamente
        mapRef.current?.animateToRegion({
          latitude: lastLoc.coords.latitude,
          longitude: lastLoc.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      }
    })();
    
    // Cargar cámaras de la zona
    fetchCameras();
  }, [fetchCameras]);

  // 2. Lógica Crítica: Disparar Pánico
  const triggerPanic = async () => {
    setLoading(true);
    try {
      // Feedback Háptico para el ciudadano
      Vibration.vibrate(Platform.OS === 'android' ? [0, 200, 100, 200] : 400);

      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      let latitude = userLocation?.latitude || 0;
      let longitude = userLocation?.longitude || 0;
      let address = 'Ubicación Desconocida';

      if (locStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
        setUserLocation(loc.coords);

        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        address = geo ? `${geo.street || ''} ${geo.city || ''}`.trim() : address;
      }

      // Enviar alerta y vincular Streamer
      const res = await api.post('/mobile/panic', {
        latitude,
        longitude,
        address,
        description: 'Pánico activado desde mapa interactivo',
      });

      setActiveAlertId(res.data.data.alertId);
      setStatus('active');
    } catch (e: any) {
      Alert.alert('Error Crítico', 'No se pudo enviar la alerta. Verifica conexión a internet (3G/4G).');
    } finally {
      setLoading(false);
    }
  };

  const cancelAlert = async () => {
    if (!activeAlertId) return;
    setStatus('cancelling');
    try {
      await api.patch(`/mobile/alerts/${activeAlertId}/cancel`);
      setActiveAlertId(null);
      setStatus('idle');
    } catch (e) {
      Alert.alert('Error', 'No se pudo cancelar la alerta en la red.');
      setStatus('active');
    }
  };

  const handleLogout = async () => {
    if (activeAlertId) {
      Alert.alert('Seguridad', 'Por favor, neutraliza tu alerta antes de cerrar sesión.');
      return;
    }
    await authService.logout();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* 🗺️ MAPA INTERACTIVO (Full Screen Background) */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={INITIAL_REGION}
        showsUserLocation={true}         // Delega el "blue dot" al sistema nativo (Cero consumo React bridge)
        showsMyLocationButton={false}    // Ocultar botón nativo para UI custom
        showsCompass={false}
        mapType="standard"
        userInterfaceStyle="dark"
      >
        {/* Renderizado de Cámaras */}
        {cameras.map(camera => (
          <Marker
            key={camera.id}
            coordinate={{ latitude: camera.location.latitude, longitude: camera.location.longitude }}
            title={camera.name}
            description="Cámara de Seguridad Activa"
          >
            <View style={styles.cameraMarker}>
              <Text style={styles.cameraIcon}>📹</Text>
            </View>
          </Marker>
        ))}

        {/* Círculo de cobertura de Pánico (Solo visible en alerta) */}
        {status === 'active' && (currentLocation || userLocation) && (
          <Circle
            center={{ 
              latitude: currentLocation?.lat || userLocation!.latitude, 
              longitude: currentLocation?.lng || userLocation!.longitude 
            }}
            radius={150}
            strokeWidth={2}
            strokeColor="rgba(229, 62, 62, 0.8)"
            fillColor="rgba(229, 62, 62, 0.2)"
          />
        )}
      </MapView>

      {/* 🛡️ OVERLAY: Header Glassmorphism */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Red Ciudadana</Text>
          <View style={styles.pulseIndicator} />
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* 🧭 OVERLAY: Floating Action Button -> Center Map */}
      <TouchableOpacity 
        style={styles.centerMapBtn} 
        onPress={() => {
          if (userLocation) {
            mapRef.current?.animateToRegion({
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            });
          }
        }}
      >
        <Text style={styles.centerIcon}>📍</Text>
      </TouchableOpacity>

      {/* 🚨 OVERLAY: Bottom Action Area (Panic) */}
      <View style={styles.bottomOverlay}>
        
        {/* Banner de Estado Dinámico */}
        <View style={styles.statusBanner(status)}>
          <Text style={styles.statusText}>
            {status === 'idle' && 'ZONA PROTEGIDA'}
            {status === 'active' && 'SOS ENVIADO - UBICACIÓN COMPARTIDA'}
            {status === 'cancelling' && 'CANCELANDO ALERTA...'}
          </Text>
        </View>

        {/* El Botón Gigante (Diseño Industrial/Táctico) */}
        <View style={styles.buttonContainer}>
          {status === 'idle' ? (
            <TouchableOpacity
              style={styles.panicButton}
              onPress={triggerPanic}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <>
                  <Text style={styles.panicLabel}>S O S</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancelAlert}
              disabled={status === 'cancelling'}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelLabel}>FALSA ALARMA</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000',
  },
  // Header flotante
  header: {
    position: 'absolute', top: 50, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(26, 32, 44, 0.85)',
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#E2E8F0', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  pulseIndicator: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#48BB78', marginLeft: 8,
  },
  logoutBtn: { padding: 4 },
  logoutText: { color: '#A0AEC0', fontSize: 13, fontWeight: '600' },
  
  // Botones flotantes
  centerMapBtn: {
    position: 'absolute', right: 20, bottom: 220,
    backgroundColor: 'white', width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 6,
  },
  centerIcon: { fontSize: 24 },

  cameraMarker: {
    backgroundColor: 'rgba(49, 130, 206, 0.9)',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, elevation: 4,
  },
  cameraIcon: { fontSize: 16 },

  // Área Inferior
  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 60,
    // Gradiente oscuro suave para legibilidad del botón sobre el mapa
    backgroundColor: 'transparent', 
  },
  statusBanner: (status: string) => ({
    paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20,
    backgroundColor: status === 'active' ? 'rgba(229, 62, 62, 0.9)' : status === 'cancelling' ? 'rgba(221, 107, 32, 0.9)' : 'rgba(45, 55, 72, 0.9)',
    marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  }),
  statusText: { color: 'white', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  
  // Botones Principales (Masivos)
  buttonContainer: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5, shadowRadius: 15, elevation: 20,
  },
  panicButton: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#E53E3E',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 6, borderColor: '#FED7D7',
  },
  panicLabel: { color: 'white', fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  
  cancelButton: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#2D3748',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#A0AEC0',
  },
  cancelLabel: { color: 'white', fontSize: 16, fontWeight: '800', textAlign: 'center' },
});
