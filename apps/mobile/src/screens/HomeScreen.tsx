import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Vibration,
  Platform,
  Animated,
  Easing,
  StatusBar,
  useWindowDimensions,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TacticalMap } from '../components/TacticalMap';
import * as Location from 'expo-location';
import { authService } from '../services/auth';
import { panicService, PanicState } from '../services/panicService';
import { ghostModeService } from '../services/GhostModeService';
import { useLocationStreaming } from '../hooks/useLocationStreaming';
import { useCameras } from '../hooks/useCameras';
import {
  palette,
  fontSans,
  glassSurfaceStyle,
  sculptedShadow,
  USE_NATIVE_DRIVER,
} from '../theme/prismTheme';
import {
  LiquidGlassCard,
  LiquidPillButton,
  PrismEmblem,
  PrismIcon,
  StatusPill,
  TelemetryEqualizer,
} from '../components/ui/PrismPrimitives';

const INITIAL_REGION = {
  latitude: 7.0653,
  longitude: -73.8547,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

export interface HomeScreenProps {
  onLogout?: () => void;
  onOpenPatrol?: () => void;
}

export default function HomeScreen({ onLogout, onOpenPatrol }: HomeScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const isCompact = viewportHeight < 740;

  const mapRef = useRef<any>(null);
  const cameraCycleIdxRef = useRef<number>(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  const [panicState, setPanicState] = useState<PanicState>(panicService.getState());
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>(
    'Obteniendo tu ubicación actual...'
  );
  const [gpsReady, setGpsReady] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    authService
      .getProfile()
      .then((p) => setProfile(p))
      .catch(() => {});
  }, []);

  const { currentLocation } = useLocationStreaming({ alertId: panicState.alertId });
  const { cameras, fetchCameras } = useCameras();

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.035,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    pulseLoop.start();

    const waveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    waveLoop.start();

    return () => {
      pulseLoop.stop();
      waveLoop.stop();
    };
  }, [pulseAnim, waveAnim]);

  useEffect(() => {
    const unsubscribe = panicService.subscribe((state) => {
      setPanicState(state);
    });
    return unsubscribe;
  }, []);

  // Cross-platform reverse geocoding (iOS, Android & Web)
  const resolveReadableAddress = useCallback(async (lat: number, lng: number) => {
    if (Platform.OS !== 'web') {
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geo) {
          const str = [geo.street, geo.name, geo.district || geo.city]
            .filter(Boolean)
            .join(', ');
          if (str) return str;
        }
      } catch {
        // Fallback below
      }
    }

    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`
      );
      if (resp.ok) {
        const data = await resp.json();
        const addr = data?.address;
        if (addr) {
          const parts = [
            addr.road || addr.pedestrian || addr.suburb,
            addr.neighbourhood || addr.city_district,
            addr.city || addr.town || addr.municipality,
          ].filter(Boolean);
          if (parts.length > 0) return parts.join(', ');
        }
      }
    } catch {
      // Ignore network reverse geocode errors
    }

    return 'Ubicación GPS confirmada';
  }, []);

  // Reliable geolocation across iOS, Android, and Web/Mobile Browsers
  const acquireLocation = useCallback(async () => {
    setCurrentAddress('Sincronizando tu posición...');

    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setCurrentAddress('Geolocalización no soportada en este navegador');
        return;
      }

      const applyWebPosition = async (pos: GeolocationPosition) => {
        const coords: Location.LocationObjectCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        };
        setUserLocation(coords);
        setGpsReady(true);
        mapRef.current?.animateToRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        const label = await resolveReadableAddress(coords.latitude, coords.longitude);
        setCurrentAddress(label);
      };

      navigator.geolocation.getCurrentPosition(
        applyWebPosition,
        () => {
          // Fallback to Wi-Fi / network accuracy if hardware GPS times out
          navigator.geolocation.getCurrentPosition(
            applyWebPosition,
            () => {
              setCurrentAddress('Toca aquí para permitir tu ubicación');
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 15000 }
      );
      return;
    }

    // Native iOS & Android
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCurrentAddress('Toca aquí para activar tu ubicación');
        return;
      }

      // 1. Fast initial lock from cached last-known position on iOS/Android
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown?.coords) {
        setUserLocation(lastKnown.coords);
        setGpsReady(true);
        mapRef.current?.animateToRegion({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        });
      }

      // 2. Fresh GPS fix (Balanced resolves quickly indoors & outdoors on Android/iOS)
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation(loc.coords);
      setGpsReady(true);

      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      const readable = await resolveReadableAddress(
        loc.coords.latitude,
        loc.coords.longitude
      );
      setCurrentAddress(readable);
    } catch (err) {
      console.warn('Error inicializando GPS en HomeScreen:', err);
      setCurrentAddress('Ubicación aproximada · Toca para reintentar');
    }
  }, [resolveReadableAddress]);

  useEffect(() => {
    acquireLocation();
    fetchCameras();
  }, [acquireLocation, fetchCameras]);

  const handleTriggerPanic = async () => {
    if (panicState.status === 'triggering' || panicState.status === 'active') return;

    Vibration.vibrate(Platform.OS === 'android' ? [0, 250, 100, 250] : 400);

    try {
      await panicService.sendPanicAlert({
        triggerType: 'button',
        description: 'PÁNICO CIUDADANO activado desde Botón Central SOS',
        customCoords: userLocation
          ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
          : undefined,
      });
    } catch {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.alert(
            'Tu alerta fue guardada de forma segura y se enviará en cuanto regrese la señal.'
          );
        }
      } else {
        Alert.alert(
          'Alerta resguardada',
          'Detectamos poca señal, pero tu alerta quedó guardada para enviarse de inmediato.',
          [{ text: 'Entendido' }]
        );
      }
    }
  };

  const handleCancelAlert = async () => {
    const executeCancel = async () => {
      try {
        await panicService.cancelPanicAlert();
      } catch {
        if (Platform.OS !== 'web') {
          Alert.alert('Aviso', 'Alerta desactivada en tu dispositivo.');
        }
      }
    };

    if (Platform.OS === 'web') {
      const ok =
        typeof window !== 'undefined'
          ? window.confirm('¿Deseas cancelar la alerta activa y reportarla como falsa alarma?')
          : true;
      if (ok) await executeCancel();
      return;
    }

    Alert.alert(
      'Cancelar alerta',
      '¿Deseas reportar como falsa alarma y detener el envío de ubicación?',
      [
        { text: 'Seguir con alerta', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: executeCancel,
        },
      ]
    );
  };

  const handleLogout = () => {
    if (panicState.status === 'active' || panicState.status === 'triggering') {
      const msg = 'Cancela primero la alerta activa antes de cerrar tu sesión.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Alerta en curso', msg);
      }
      return;
    }

    const performLogout = async () => {
      try {
        await authService.logout();
        onLogout?.();
      } catch (err) {
        console.error('Error al cerrar sesión:', err);
        if (Platform.OS !== 'web') {
          Alert.alert('Error', 'No se pudo cerrar la sesión correctamente.');
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('¿Deseas cerrar tu sesión en Red Ciudadana?')
          : true;
      if (confirmed) performLogout();
    } else {
      Alert.alert('Cerrar sesión', '¿Seguro que deseas salir de tu cuenta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: performLogout },
      ]);
    }
  };

  const centerOnUser = () => {
    const lat = currentLocation?.lat ?? userLocation?.latitude;
    const lng = currentLocation?.lng ?? userLocation?.longitude;
    if (lat != null && lng != null) {
      mapRef.current?.animateToRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
    } else {
      // Si aún no se concedió GPS, volver a solicitarlo y centrar en región activa
      acquireLocation();
      mapRef.current?.animateToRegion({
        latitude: INITIAL_REGION.latitude,
        longitude: INITIAL_REGION.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      });
    }
  };

  const focusCameraOnMap = () => {
    if (!cameras || cameras.length === 0) {
      fetchCameras();
      return;
    }
    const idx = cameraCycleIdxRef.current % cameras.length;
    cameraCycleIdxRef.current = idx + 1;
    const cam = cameras[idx];
    if (cam?.location) {
      mapRef.current?.animateToRegion({
        latitude: cam.location.latitude,
        longitude: cam.location.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
      setCurrentAddress(
        cam.location.address ? `${cam.name} · ${cam.location.address}` : cam.name
      );
    }
  };

  const isAlertActive = panicState.status === 'active';
  const isTriggering = panicState.status === 'triggering';
  const isCancelling = panicState.status === 'cancelling';

  const waveScale = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.24],
  });
  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.42, 0.16, 0],
  });

  const topOffset = Math.max(insets.top + 8, 16);
  const bezelSize = isCompact ? 168 : 190;
  const domeSize = isCompact ? 136 : 154;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Mapa real interactivo (Apple Maps en iOS, Google Maps en Android, Leaflet en Web) */}
      <TacticalMap
        mapRef={mapRef as any}
        initialRegion={INITIAL_REGION}
        userLocation={userLocation}
        currentLocation={currentLocation}
        cameras={cameras}
        isAlertActive={isAlertActive}
      />

      {/* ================================================================== */}
      {/* TOP FLOATING LIQUID GLASS BAR + LOCATION CARD                      */}
      {/* ================================================================== */}
      <View style={[styles.topClusterWrap, { top: topOffset }]}>
        <View style={styles.topShell}>
          <View style={[styles.headerBar, glassSurfaceStyle(28, true)]}>
            <View style={styles.brandGroup}>
              <PrismEmblem size={38} activeAlert={isAlertActive} />
              <View style={styles.brandTextCol}>
                <View style={styles.brandTitleRow}>
                  <Text style={styles.brandTitle}>Red Ciudadana</Text>
                  {profile?.isVerified ? (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>Verificado</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.statusInline}>
                  <View
                    style={[
                      styles.liveDot,
                      {
                        backgroundColor: isAlertActive
                          ? palette.crimson
                          : palette.emeraldBright,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusSubLabel,
                      isAlertActive && { color: palette.crimsonDeep },
                    ]}
                  >
                    {isAlertActive ? 'Enviando ayuda en vivo' : 'Acompañamiento activo'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.headerActions}>
              {['operator', 'police', 'admin'].includes(profile?.role) && onOpenPatrol ? (
                <LiquidPillButton
                  label="Patrulla"
                  variant="obsidian"
                  size="sm"
                  icon="beacon"
                  iconPosition="left"
                  onPress={onOpenPatrol}
                />
              ) : null}

              <TouchableOpacity
                onPress={handleLogout}
                activeOpacity={0.75}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.logoutCapsule}
              >
                <PrismIcon name="logout" size={14} color={palette.textPrimary} />
                <Text style={styles.logoutLabel}>Salir</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Frosted Pearl Location & Signal Card (tappable to refresh/enable GPS) */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={!gpsReady ? acquireLocation : centerOnUser}
          >
            <LiquidGlassCard style={styles.locationCard} blurPx={28}>
              <View style={styles.locationRow}>
                <View style={styles.locationMain}>
                  <View style={styles.badgesInline}>
                    <StatusPill
                      label={gpsReady ? 'Ubicación precisa' : 'Ubicación en mapa'}
                      tone={gpsReady ? 'aqua' : 'amber'}
                    />
                    {panicState.isOffline ? (
                      <StatusPill label="Sin red · Guardado seguro" tone="crimson" />
                    ) : null}
                  </View>

                  <Text style={styles.addressLine} numberOfLines={1}>
                    {panicState.address || currentAddress}
                  </Text>

                  <Text style={styles.coordsCaption}>
                    {currentLocation || userLocation
                      ? `${(currentLocation?.lat ?? userLocation!.latitude).toFixed(5)}, ${(currentLocation?.lng ?? userLocation!.longitude).toFixed(5)}`
                      : `${INITIAL_REGION.latitude.toFixed(4)}, ${INITIAL_REGION.longitude.toFixed(4)} · Arrastra o acerca el mapa`}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.signalCol}
                  activeOpacity={0.7}
                  onPress={focusCameraOnMap}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <TelemetryEqualizer
                    color={isAlertActive ? palette.crimson : palette.aqua}
                    active
                  />
                  <Text style={styles.camerasCountLabel}>
                    {cameras.length} {cameras.length === 1 ? 'cámara' : 'cámaras'}
                  </Text>
                </TouchableOpacity>
              </View>
            </LiquidGlassCard>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================================================================== */}
      {/* FLOATING RECENTER BUTTON                                           */}
      {/* ================================================================== */}
      <TouchableOpacity
        style={[
          styles.recenterButton,
          glassSurfaceStyle(24, true),
          { bottom: Math.max(insets.bottom, 16) + (isCompact ? 276 : 312) },
        ]}
        onPress={centerOnUser}
        activeOpacity={0.8}
      >
        <PrismIcon name="crosshair" size={20} color={palette.textPrimary} />
      </TouchableOpacity>

      {/* ================================================================== */}
      {/* BOTTOM STAGE: 3D LIQUID-GLASS BEZEL SOS MEDALLION + SILENT DOCK    */}
      {/* ================================================================== */}
      <View
        style={[
          styles.bottomStage,
          { paddingBottom: Math.max(insets.bottom + 6, 18) },
        ]}
      >
        <View style={styles.bottomShell}>
          <View style={{ marginBottom: isCompact ? 12 : 16 }}>
            <StatusPill
              label={
                isAlertActive
                  ? 'Alerta activa · Unidades en camino'
                  : isTriggering
                  ? 'Conectando con el centro de ayuda...'
                  : isCancelling
                  ? 'Cancelando alerta...'
                  : 'Estamos listos para asistirte'
              }
              tone={
                isAlertActive
                  ? 'crimson'
                  : isTriggering || isCancelling
                  ? 'amber'
                  : 'neutral'
              }
            />
          </View>

          <View
            style={[
              styles.medallionStage,
              {
                width: bezelSize,
                height: bezelSize,
                marginBottom: isCompact ? 14 : 18,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.rippleWave,
                {
                  width: bezelSize,
                  height: bezelSize,
                  borderRadius: bezelSize / 2,
                  borderColor: isAlertActive
                    ? 'rgba(225, 29, 72, 0.45)'
                    : 'rgba(225, 29, 72, 0.22)',
                  opacity: waveOpacity,
                  transform: [{ scale: waveScale }],
                },
              ]}
            />

            <View
              style={[
                styles.outerGlassBezel,
                glassSurfaceStyle(26, true),
                {
                  width: bezelSize,
                  height: bezelSize,
                  borderRadius: bezelSize / 2,
                },
              ]}
            />

            {!isAlertActive ? (
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.sosDome,
                    {
                      width: domeSize,
                      height: domeSize,
                      borderRadius: domeSize / 2,
                    },
                    sculptedShadow('rgba(225, 29, 72, 0.42)', 28, 0.34, 10),
                    isTriggering && styles.sosDomeTriggering,
                  ]}
                  onPress={handleTriggerPanic}
                  disabled={isTriggering}
                  activeOpacity={0.86}
                >
                  <View style={styles.domeInnerRim} />

                  {isTriggering ? (
                    <View style={styles.domeCenter}>
                      <ActivityIndicator color="#FFFFFF" size="large" />
                      <Text style={styles.sosSubtitle}>Enviando...</Text>
                    </View>
                  ) : (
                    <View style={styles.domeCenter}>
                      <Text style={[styles.sosTitle, isCompact && { fontSize: 32 }]}>
                        SOS
                      </Text>
                      <Text style={styles.sosSubtitle}>Pedir ayuda</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.cancelObsidianDome,
                  {
                    width: domeSize,
                    height: domeSize,
                    borderRadius: domeSize / 2,
                  },
                  sculptedShadow('rgba(12, 15, 20, 0.32)', 26, 0.28, 10),
                ]}
                onPress={handleCancelAlert}
                disabled={isCancelling}
                activeOpacity={0.86}
              >
                {isCancelling ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.domeCenter}>
                    <Text style={styles.cancelDomeTitle}>Cancelar</Text>
                    <Text style={styles.cancelDomeSub}>Falsa alarma</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.silentDock, glassSurfaceStyle(26, true)]}>
            <View style={styles.silentIconCircle}>
              <PrismIcon name="waves" size={16} color={palette.aqua} />
            </View>
            <View style={styles.silentTextCol}>
              <Text style={styles.silentTitle}>
                Modo silencioso · <Text style={styles.silentHighlight}>3× bajar volumen</Text>
              </Text>
              <Text style={styles.silentSub}>
                Apaga la pantalla y comparte ubicación y audio sin ser notado
              </Text>
            </View>
            <TouchableOpacity
              style={styles.testBlackChip}
              onPress={() => ghostModeService.simulateTrigger()}
              activeOpacity={0.8}
            >
              <Text style={styles.testBlackChipText}>Probar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.canvas,
  },

  topClusterWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'box-none',
  } as ViewStyle,
  topShell: {
    width: '100%',
    maxWidth: 540,
    gap: 10,
    pointerEvents: 'box-none',
  } as ViewStyle,

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  brandTextCol: {
    flexShrink: 1,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  brandTitle: {
    fontFamily: fontSans,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: palette.textPrimary,
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: palette.emeraldTint,
    borderWidth: 1,
    borderColor: palette.emeraldBorder,
  },
  verifiedBadgeText: {
    fontFamily: fontSans,
    fontSize: 10,
    fontWeight: '600',
    color: '#0F766E',
  },
  statusInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusSubLabel: {
    fontFamily: fontSans,
    fontSize: 11.5,
    fontWeight: '500',
    color: palette.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  logoutLabel: {
    fontFamily: fontSans,
    fontSize: 12.5,
    fontWeight: '600',
    color: palette.textPrimary,
  },

  locationCard: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationMain: {
    flex: 1,
  },
  badgesInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  addressLine: {
    fontFamily: fontSans,
    fontSize: 14.5,
    fontWeight: '600',
    color: palette.textPrimary,
    marginBottom: 2,
  },
  coordsCaption: {
    fontFamily: fontSans,
    fontSize: 12,
    color: palette.textMuted,
  },
  signalCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 14,
    borderLeftWidth: 1,
    borderLeftColor: palette.borderSubtle,
    gap: 6,
  },
  camerasCountLabel: {
    fontFamily: fontSans,
    fontSize: 11.5,
    fontWeight: '600',
    color: palette.textSecondary,
  },

  recenterButton: {
    position: 'absolute',
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },

  bottomStage: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'box-none',
  } as ViewStyle,
  bottomShell: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    pointerEvents: 'box-none',
  } as ViewStyle,

  medallionStage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rippleWave: {
    position: 'absolute',
    borderWidth: 1.5,
    backgroundColor: 'rgba(225, 29, 72, 0.05)',
  },
  outerGlassBezel: {
    position: 'absolute',
  },
  sosDome: {
    backgroundColor: palette.crimson,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosDomeTriggering: {
    backgroundColor: palette.crimsonDeep,
  },
  domeInnerRim: {
    position: 'absolute',
    top: 7,
    left: 7,
    right: 7,
    bottom: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.34)',
  },
  domeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTitle: {
    fontFamily: fontSans,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  sosSubtitle: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 2,
  },
  cancelObsidianDome: {
    backgroundColor: palette.obsidianPill,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelDomeTitle: {
    fontFamily: fontSans,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelDomeSub: {
    fontFamily: fontSans,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 2,
  },

  silentDock: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 11,
  },
  silentIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.aquaTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  silentTextCol: {
    flex: 1,
  },
  silentTitle: {
    fontFamily: fontSans,
    fontSize: 12.5,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  silentHighlight: {
    color: '#0284C7',
    fontWeight: '700',
  },
  silentSub: {
    fontFamily: fontSans,
    fontSize: 11.5,
    color: palette.textSecondary,
    marginTop: 1,
  },
  testBlackChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: palette.obsidianPill,
  },
  testBlackChipText: {
    fontFamily: fontSans,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
