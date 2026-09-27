import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Vibration,
  Platform,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TacticalMap } from '../components/TacticalMap';
import * as Location from 'expo-location';
import { authService } from '../services/auth';
import { panicService, PanicState } from '../services/panicService';
import { ghostModeService } from '../services/GhostModeService';
import { useLocationStreaming } from '../hooks/useLocationStreaming';
import { useCameras } from '../hooks/useCameras';

const { width } = Dimensions.get('window');

// 📍 Coordenadas de contingencia iniciales (Bogotá, Colombia)
const INITIAL_REGION = {
  latitude: 4.6097,
  longitude: -74.0817,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;

  // Estado del servicio de pánico
  const [panicState, setPanicState] = useState<PanicState>(panicService.getState());

  // Ubicación del ciudadano
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('Obteniendo ubicación satelital...');
  const [gpsReady, setGpsReady] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    authService.getProfile().then(p => setProfile(p)).catch(() => {});
  }, []);

  // Streaming de GPS continuo mientras la alerta esté activa
  const { currentLocation } = useLocationStreaming({ alertId: panicState.alertId });
  const { cameras, fetchCameras } = useCameras();

  // Animación de pulso táctico para el botón central de pánico
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const radarLoop = Animated.loop(
      Animated.timing(radarAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    );
    radarLoop.start();

    return () => {
      pulseLoop.stop();
      radarLoop.stop();
    };
  }, [pulseAnim, radarAnim]);

  // Suscripción al estado unificado de pánico (actualiza si se dispara desde botón o Modo Fantasma)
  useEffect(() => {
    const unsubscribe = panicService.subscribe((state) => {
      setPanicState(state);
    });
    return unsubscribe;
  }, []);

  // 1. Inicialización de GPS y cámaras de la red ciudadana
  useEffect(() => {
    let isMounted = true;

    async function initLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          if (!isMounted) return;
          setUserLocation(loc.coords);
          setGpsReady(true);

          // Animar mapa a la posición del usuario
          mapRef.current?.animateToRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          });

          // Obtener dirección
          try {
            const [geo] = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            if (geo && isMounted) {
              const str = [geo.street, geo.name, geo.district || geo.city]
                .filter(Boolean)
                .join(', ');
              setCurrentAddress(str || 'Ubicación GPS identificada');
            }
          } catch (e) {
            if (isMounted) setCurrentAddress('Coordenadas GPS fijadas');
          }
        } else {
          if (isMounted) setCurrentAddress('Permiso de GPS no concedido');
        }
      } catch (err) {
        console.warn('Error inicializando GPS en HomeScreen:', err);
        if (isMounted) setCurrentAddress('Ubicación aproximada');
      }
    }

    initLocation();
    fetchCameras();

    return () => {
      isMounted = false;
    };
  }, [fetchCameras]);

  // 2. Disparar Pánico desde el Botón Visual
  const handleTriggerPanic = async () => {
    if (panicState.status === 'triggering' || panicState.status === 'active') return;

    // Vibración de advertencia
    Vibration.vibrate(Platform.OS === 'android' ? [0, 250, 100, 250] : 400);

    try {
      await panicService.sendPanicAlert({
        triggerType: 'button',
        description: '🚨 PÁNICO CIUDADANO activado desde Botón Central SOS',
        customCoords: userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : undefined,
      });
    } catch (err: any) {
      Alert.alert(
        'Alerta de Emergencia',
        'Hubo un problema de red directa, pero su alerta fue guardada en el buffer seguro para transmisión inmediata.',
        [{ text: 'Entendido' }]
      );
    }
  };

  // 3. Cancelar Alerta / Falsa Alarma
  const handleCancelAlert = () => {
    Alert.alert(
      'Cancelar Alerta de Emergencia',
      '¿Deseas reportar como falsa alarma y desactivar el estado de emergencia?',
      [
        { text: 'Continuar con Alerta', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await panicService.cancelPanicAlert();
            } catch (err) {
              Alert.alert('Aviso', 'Alerta desactivada en el dispositivo local.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    if (panicState.status === 'active') {
      Alert.alert('Alerta Activa', 'Debes desactivar la emergencia antes de salir.');
      return;
    }
    await authService.logout();
  };

  const centerOnUser = () => {
    const lat = currentLocation?.lat || userLocation?.latitude;
    const lng = currentLocation?.lng || userLocation?.longitude;
    if (lat && lng) {
      mapRef.current?.animateToRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
    }
  };

  const isAlertActive = panicState.status === 'active';
  const isTriggering = panicState.status === 'triggering';
  const isCancelling = panicState.status === 'cancelling';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E17" />

      {/* 🗺️ MAPA TÁCTICO OSCURO DE FONDO (Nativo en iOS/Android, Radar en Web) */}
      <TacticalMap
        mapRef={mapRef as any}
        initialRegion={INITIAL_REGION}
        userLocation={userLocation}
        currentLocation={currentLocation}
        cameras={cameras}
        isAlertActive={isAlertActive}
      />

      {/* Capa de Oscurecimiento Táctico sobre el mapa */}
      <View style={styles.darkBackdrop} pointerEvents="none" />

      {/* 🛡️ HEADER MINIMALISTA OSCURO */}
      <View style={[styles.header, { top: Math.max(insets.top + 6, 16) }]}>
        <View style={styles.brandRow}>
          <Text style={styles.brandShield}>🛡️</Text>
          <View>
            <Text style={styles.brandTitle}>RED CIUDADANA</Text>
            <View style={styles.connectionBadge}>
              <View style={[styles.statusDot, isAlertActive && styles.statusDotAlert]} />
              <Text style={styles.connectionText}>
                {isAlertActive ? 'TRANSMITIENDO EMERGENCIA' : 'RED ACTIVA & ENLAZADA'}
              </Text>
              {profile?.isVerified ? (
                <Text style={{ color: '#4ADE80', fontSize: 10, fontWeight: 'bold', marginLeft: 6 }}>
                  • 🛡️ KYC OK
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>SALIR</Text>
        </TouchableOpacity>
      </View>

      {/* 📍 CARD DE TELEMETRÍA GPS MINIMALISTA */}
      <View style={[styles.telemetryCard, { top: Math.max(insets.top + 6, 16) + 68 }]}>
        <View style={styles.telemetryHeader}>
          <View style={styles.gpsRow}>
            <View style={[styles.gpsDot, gpsReady && styles.gpsDotActive]} />
            <Text style={styles.gpsLabel}>
              {gpsReady ? 'GPS FIJADO (ALTA PRECISIÓN)' : 'LOCALIZANDO...'}
            </Text>
          </View>
          {panicState.isOffline && (
            <View style={styles.offlineChip}>
              <Text style={styles.offlineChipText}>MODO COLA OFFLINE</Text>
            </View>
          )}
        </View>

        <Text style={styles.addressText} numberOfLines={1}>
          {panicState.address || currentAddress}
        </Text>

        <View style={styles.coordsRow}>
          <Text style={styles.coordText}>
            LAT: {(currentLocation?.lat || userLocation?.latitude || 0).toFixed(5)}
          </Text>
          <Text style={styles.coordSeparator}>|</Text>
          <Text style={styles.coordText}>
            LNG: {(currentLocation?.lng || userLocation?.longitude || 0).toFixed(5)}
          </Text>
        </View>
      </View>

      {/* 🧭 BOTÓN FLOTANTE PARA CENTRAR UBICACIÓN */}
      <TouchableOpacity
        style={[styles.centerMapBtn, { bottom: Math.max(insets.bottom, 16) + 330 }]}
        onPress={centerOnUser}
      >
        <Text style={styles.centerIcon}>🎯</Text>
      </TouchableOpacity>

      {/* 🚨 ZONA DE ACCIÓN CENTRAL: BOTÓN DE PÁNICO MASIVO */}
      <View style={[styles.centerActionArea, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Banner de Estado Dinámico */}
        <View
          style={[
            styles.statusBanner,
            isAlertActive
              ? styles.statusBannerActive
              : isCancelling
              ? styles.statusBannerCancelling
              : styles.statusBannerIdle,
          ]}
        >
          <Text style={styles.statusBannerText}>
            {isAlertActive
              ? '🚨 ALERTA ACTIVA · AYUDA EN CAMINO'
              : isTriggering
              ? '📡 CONECTANDO CON CENTRO DE OPERACIONES...'
              : isCancelling
              ? '⏳ CANCELANDO ALERTA...'
              : 'PROTECCIÓN CIUDADANA ACTIVA'}
          </Text>
        </View>

        {/* Anillos de Radar Pulsante */}
        <View style={styles.panicButtonWrapper}>
          <Animated.View
            style={[
              styles.radarRing,
              isAlertActive && styles.radarRingAlert,
              {
                transform: [
                  {
                    scale: isAlertActive ? pulseAnim : 1,
                  },
                ],
              },
            ]}
          />

          {/* El Botón Central Masivo de Emergencia */}
          {!isAlertActive ? (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.panicButton, isTriggering && styles.panicButtonTriggering]}
                onPress={handleTriggerPanic}
                disabled={isTriggering}
                activeOpacity={0.8}
              >
                {isTriggering ? (
                  <View style={styles.buttonInnerLoading}>
                    <ActivityIndicator color="#FFFFFF" size="large" />
                    <Text style={styles.panicSubtext}>ENVIANDO...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonInner}>
                    <Text style={styles.panicLabel}>SOS</Text>
                    <Text style={styles.panicSubtext}>BOTÓN DE PÁNICO</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <TouchableOpacity
              style={styles.cancelAlertButton}
              onPress={handleCancelAlert}
              disabled={isCancelling}
              activeOpacity={0.85}
            >
              {isCancelling ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.cancelLabel}>FALSA ALARMA</Text>
                  <Text style={styles.cancelSubtext}>Toca para cancelar alerta</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* 👻 BANNER DISCRETO DE MODO FANTASMA */}
        <View style={styles.ghostHintContainer}>
          <Text style={styles.ghostHintIcon}>👻</Text>
          <Text style={styles.ghostHintText}>
            Modo Fantasma: Presiona{' '}
            <Text style={styles.ghostHintHighlight}>Bajar Volumen 3 veces</Text> para pánico sigiloso
          </Text>
        </View>

        {/* Atajo rápido para probar Modo Fantasma en simuladores/emuladores */}
        <TouchableOpacity
          style={styles.stealthTestBtn}
          onPress={() => ghostModeService.simulateTrigger()}
        >
          <Text style={styles.stealthTestText}>⚡ Simular 3x Volumen (Prueba Sigilosa)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  darkBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 14, 23, 0.45)',
  },

  // 🛡️ Header Táctico
  header: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandShield: {
    fontSize: 24,
    marginRight: 10,
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusDotAlert: {
    backgroundColor: '#EF4444',
  },
  connectionText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // 📍 Telemetría GPS
  telemetryCard: {
    position: 'absolute',
    top: 125,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    marginRight: 6,
  },
  gpsDotActive: {
    backgroundColor: '#38BDF8',
  },
  gpsLabel: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  offlineChip: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offlineChipText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  addressText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 4,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordText: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  coordSeparator: {
    color: '#334155',
    marginHorizontal: 8,
  },

  // 🧭 Botón Flotante Map
  centerMapBtn: {
    position: 'absolute',
    right: 20,
    bottom: 340,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  centerIcon: {
    fontSize: 20,
  },

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

  // 🚨 Zona Central de Acción
  centerActionArea: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  statusBanner: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusBannerIdle: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statusBannerActive: {
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
    borderColor: '#F87171',
  },
  statusBannerCancelling: {
    backgroundColor: 'rgba(217, 119, 6, 0.92)',
    borderColor: '#FBBF24',
  },
  statusBannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },

  // Botón Masivo
  panicButtonWrapper: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  radarRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  radarRingAlert: {
    borderColor: 'rgba(239, 68, 68, 0.7)',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  panicButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#FCA5A5',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  panicButtonTriggering: {
    backgroundColor: '#991B1B',
    borderColor: '#F87171',
  },
  buttonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInnerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  panicLabel: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 3,
  },
  panicSubtext: {
    color: '#FEE2E2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },

  cancelAlertButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#94A3B8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 12,
  },
  cancelLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  cancelSubtext: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  // 👻 Banner de Modo Fantasma
  ghostHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
    maxWidth: width - 40,
  },
  ghostHintIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  ghostHintText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  ghostHintHighlight: {
    color: '#38BDF8',
    fontWeight: '800',
  },

  // Botón de prueba simulada
  stealthTestBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  stealthTestText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
