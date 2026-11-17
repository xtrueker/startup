import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Vibration,
  Animated,
  Easing,
  Modal,
  Linking,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  patrolService,
  PatrolState,
  PatrolStatus,
  TacticalDispatch,
} from '../services/PatrolService';
import {
  palette,
  fontSans,
  glassSurfaceStyle,
  sculptedShadow,
  USE_NATIVE_DRIVER,
} from '../theme/prismTheme';
import {
  AmbientPrismCanvas,
  LiquidGlassCard,
  LiquidPillButton,
  PrismEmblem,
  PrismIcon,
  StatusPill,
  TelemetryEqualizer,
} from '../components/ui/PrismPrimitives';

interface PatrolModeScreenProps {
  onBack?: () => void;
  onLogout?: () => void;
  isDedicatedOfficer?: boolean;
}

const STATUS_CONFIG: Record<
  PatrolStatus,
  {
    label: string;
    shortLabel: string;
    color: string;
    pillTone: 'neutral' | 'emerald' | 'amber' | 'crimson';
  }
> = {
  off_duty: {
    label: 'Fuera de turno',
    shortLabel: 'Inactivo',
    color: palette.textMuted,
    pillTone: 'neutral',
  },
  available: {
    label: 'Disponible en zona',
    shortLabel: 'Disponible',
    color: palette.emeraldBright,
    pillTone: 'emerald',
  },
  responding: {
    label: 'En camino a emergencia',
    shortLabel: 'En ruta',
    color: palette.amber,
    pillTone: 'amber',
  },
  busy: {
    label: 'Atendiendo en sitio',
    shortLabel: 'Ocupado',
    color: palette.crimson,
    pillTone: 'crimson',
  },
};

export default function PatrolModeScreen({
  onBack,
  onLogout,
  isDedicatedOfficer = false,
}: PatrolModeScreenProps) {
  const [state, setState] = useState<PatrolState>(patrolService.getState());
  const [loading, setLoading] = useState(false);
  const [activeDispatch, setActiveDispatch] = useState<TacticalDispatch | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const unsub = patrolService.subscribe(setState);

    if (!patrolService.getState().isActive) {
      patrolService.startPatrol().catch((err) => {
        console.warn('Auto-start patrol failed:', err);
      });
    }

    const unsubDispatch = patrolService.onDispatch((dispatch) => {
      setActiveDispatch(dispatch);
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    });

    return () => {
      unsub();
      unsubDispatch();
    };
  }, []);

  const handleOpenFastestRoute = (dispatch: TacticalDispatch) => {
    patrolService.setStatus('responding');
    const { latitude, longitude, citizenName } = dispatch;

    const label = encodeURIComponent(`Auxilio: ${citizenName}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
        );
      });
    }
  };

  useEffect(() => {
    if (!state.isActive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state.isActive, pulseAnim]);

  const stopPatrolConfirmed = async () => {
    setLoading(true);
    await patrolService.stopPatrol();
    Vibration.vibrate(200);
    setLoading(false);
  };

  const handleTogglePatrol = async () => {
    if (state.isActive) {
      if (Platform.OS === 'web') {
        const ok =
          typeof window !== 'undefined'
            ? window.confirm(
                '¿Deseas finalizar tu turno de patrullaje? Tu ubicación dejará de compartirse con la central.'
              )
            : true;
        if (ok) await stopPatrolConfirmed();
        return;
      }

      Alert.alert(
        'Finalizar turno',
        '¿Deseas finalizar tu turno? Tu ubicación dejará de compartirse con la central.',
        [
          { text: 'Seguir activo', style: 'cancel' },
          {
            text: 'Finalizar',
            style: 'destructive',
            onPress: stopPatrolConfirmed,
          },
        ]
      );
    } else {
      setLoading(true);
      const success = await patrolService.startPatrol();
      if (success) {
        Vibration.vibrate([0, 100, 50, 100]);
      } else {
        const errMsg = state.errorMessage || 'No se pudo iniciar el turno de patrullaje.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(errMsg);
        } else {
          Alert.alert('No se pudo conectar', errMsg);
        }
      }
      setLoading(false);
    }
  };

  const handleStatusChange = (newStatus: PatrolStatus) => {
    if (!state.isActive || newStatus === state.status) return;
    patrolService.setStatus(newStatus);
    Vibration.vibrate(50);
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatSpeed = (ms: number | null) => {
    if (ms === null || ms < 0) return '0 km/h';
    return `${Math.round(ms * 3.6)} km/h`;
  };

  const currentConfig = STATUS_CONFIG[state.status];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientPrismCanvas intensity="normal" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shell}>
          {/* Top Frosted Pill Bar */}
          <View style={[styles.topBar, glassSurfaceStyle(24, true)]}>
            {isDedicatedOfficer ? (
              <TouchableOpacity
                onPress={onLogout}
                activeOpacity={0.75}
                style={styles.navChip}
              >
                <PrismIcon name="logout" size={14} color={palette.crimsonDeep} />
                <Text style={[styles.navChipText, { color: palette.crimsonDeep }]}>
                  Salir
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onBack}
                activeOpacity={0.75}
                style={styles.navChip}
              >
                <PrismIcon name="arrowLeft" size={14} color={palette.textPrimary} />
                <Text style={styles.navChipText}>Mapa</Text>
              </TouchableOpacity>
            )}

            <StatusPill label={currentConfig.label} tone={currentConfig.pillTone} />
          </View>

          {/* Main Sculpted Patrol Card */}
          <LiquidGlassCard style={styles.mainStageCard} strong blurPx={32}>
            <View style={styles.titleCluster}>
              <PrismEmblem size={42} activeAlert={state.status === 'responding'} />
              <Text style={styles.screenTitle}>Modo Patrulla</Text>
              <Text style={styles.screenSub}>
                Coordinación en vivo con el centro de atención comunitaria
              </Text>
            </View>

            {/* Sculpted Porcelain & Obsidian Medallion */}
            <View style={styles.medallionWrap}>
              <View style={[styles.outerBezel, glassSurfaceStyle(22, true)]} />

              <Animated.View
                style={{ transform: [{ scale: state.isActive ? pulseAnim : 1 }] }}
              >
                <TouchableOpacity
                  style={[
                    styles.innerMedallion,
                    state.isActive
                      ? styles.innerMedallionActive
                      : styles.innerMedallionIdle,
                    sculptedShadow('rgba(12, 15, 20, 0.24)', 24, 0.2, 8),
                  ]}
                  onPress={handleTogglePatrol}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator
                      color={state.isActive ? '#FFFFFF' : palette.textPrimary}
                      size="large"
                    />
                  ) : (
                    <>
                      <PrismIcon
                        name="radar"
                        size={32}
                        color={state.isActive ? palette.aquaSoft : palette.aqua}
                      />
                      <Text
                        style={[
                          styles.medallionLabel,
                          state.isActive && { color: '#FFFFFF' },
                        ]}
                      >
                        {state.isActive ? 'En turno' : 'Iniciar'}
                      </Text>
                      <Text
                        style={[
                          styles.medallionHint,
                          state.isActive && { color: 'rgba(255,255,255,0.72)' },
                        ]}
                      >
                        {state.isActive ? 'Toca para finalizar' : 'Compartir posición'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Segmented Pill Selector */}
            {state.isActive && (
              <View style={styles.segmentedWrap}>
                <View style={styles.segmentedTrack}>
                  {(['available', 'responding', 'busy'] as PatrolStatus[]).map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const selected = state.status === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => handleStatusChange(s)}
                        activeOpacity={0.8}
                        style={[
                          styles.segmentPill,
                          selected && styles.segmentPillSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.segmentDot,
                            { backgroundColor: cfg.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.segmentText,
                            selected && styles.segmentTextSelected,
                          ]}
                        >
                          {cfg.shortLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </LiquidGlassCard>

          {/* GPS Metrics Card */}
          {state.isActive && (
            <LiquidGlassCard style={styles.metricsCard} blurPx={28}>
              <View style={styles.metricsHeader}>
                <View>
                  <Text style={styles.metricsTitle}>Recorrido en tiempo real</Text>
                  <Text style={styles.metricsSub}>Señal GPS sincronizada</Text>
                </View>
                <TelemetryEqualizer color={currentConfig.color} active />
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricTile}>
                  <Text style={styles.metricName}>Latitud</Text>
                  <Text style={styles.metricValue}>
                    {state.latitude?.toFixed(5) ?? '--'}
                  </Text>
                </View>
                <View style={styles.metricTile}>
                  <Text style={styles.metricName}>Longitud</Text>
                  <Text style={styles.metricValue}>
                    {state.longitude?.toFixed(5) ?? '--'}
                  </Text>
                </View>
                <View style={styles.metricTile}>
                  <Text style={styles.metricName}>Velocidad</Text>
                  <Text style={styles.metricValue}>{formatSpeed(state.speed)}</Text>
                </View>
                <View style={styles.metricTile}>
                  <Text style={styles.metricName}>Precisión</Text>
                  <Text style={styles.metricValue}>
                    {state.accuracy ? `±${Math.round(state.accuracy)} m` : '--'}
                  </Text>
                </View>
                <View style={styles.metricTile}>
                  <Text style={styles.metricName}>Inicio</Text>
                  <Text style={styles.metricValue}>{formatTime(state.startedAt)}</Text>
                </View>
                <View style={styles.metricTile}>
                  <Text style={styles.metricName}>Actualizado</Text>
                  <Text style={styles.metricValue}>{formatTime(state.lastUpdate)}</Text>
                </View>
              </View>
            </LiquidGlassCard>
          )}

          <View style={[styles.privacyNote, glassSurfaceStyle(20, false)]}>
            <PrismIcon name="lock" size={15} color={palette.textSecondary} />
            <Text style={styles.privacyText}>
              Tu posición solo es visible para los operadores de la central, nunca en el mapa ciudadano.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Incoming Emergency Dispatch Modal */}
      <Modal
        visible={!!activeDispatch}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDispatch(null)}
      >
        <View style={styles.modalBackdrop}>
          <LiquidGlassCard style={styles.dispatchCard} strong blurPx={34}>
            <View style={styles.dispatchHeader}>
              <View style={styles.dispatchBadge}>
                <PrismIcon name="alert" size={22} color={palette.crimson} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.dispatchTag}>Atención inmediata</Text>
                <Text style={styles.dispatchTitle}>
                  {activeDispatch?.emergencyType || 'Solicitud de ayuda cercana'}
                </Text>
              </View>
            </View>

            <View style={styles.dispatchDetails}>
              <View style={styles.dispatchRow}>
                <Text style={styles.dispatchKey}>Ciudadano</Text>
                <Text style={styles.dispatchVal}>
                  {activeDispatch?.citizenName || 'Usuario verificado'}
                </Text>
              </View>
              <View style={styles.dispatchRow}>
                <Text style={styles.dispatchKey}>Ubicación</Text>
                <Text style={styles.dispatchVal}>
                  {activeDispatch?.address ||
                    `${activeDispatch?.latitude.toFixed(5)}, ${activeDispatch?.longitude.toFixed(5)}`}
                </Text>
              </View>
              {activeDispatch?.notes ? (
                <View style={styles.dispatchRow}>
                  <Text style={styles.dispatchKey}>Indicaciones</Text>
                  <Text style={styles.dispatchVal}>{activeDispatch.notes}</Text>
                </View>
              ) : null}
            </View>

            <LiquidPillButton
              label="Aceptar y abrir ruta rápida"
              variant="obsidian"
              size="lg"
              icon="navigation"
              onPress={() => {
                if (activeDispatch) {
                  handleOpenFastestRoute(activeDispatch);
                  setActiveDispatch(null);
                }
              }}
            />

            <TouchableOpacity
              style={styles.dismissLink}
              onPress={() => setActiveDispatch(null)}
            >
              <Text style={styles.dismissLinkText}>Cerrar aviso</Text>
            </TouchableOpacity>
          </LiquidGlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  shell: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  navChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
  },
  navChipText: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  mainStageCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  titleCluster: {
    alignItems: 'center',
    marginBottom: 22,
  },
  screenTitle: {
    fontFamily: fontSans,
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: palette.textPrimary,
    marginTop: 10,
  },
  screenSub: {
    fontFamily: fontSans,
    fontSize: 13.5,
    color: palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
  },
  medallionWrap: {
    width: 194,
    height: 194,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerBezel: {
    position: 'absolute',
    width: 194,
    height: 194,
    borderRadius: 97,
  },
  innerMedallion: {
    width: 156,
    height: 156,
    borderRadius: 78,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    gap: 4,
  },
  innerMedallionActive: {
    backgroundColor: palette.obsidianPill,
  },
  innerMedallionIdle: {
    backgroundColor: '#FFFFFF',
  },
  medallionLabel: {
    fontFamily: fontSans,
    fontSize: 18,
    fontWeight: '700',
    color: palette.textPrimary,
    marginTop: 4,
  },
  medallionHint: {
    fontFamily: fontSans,
    fontSize: 11.5,
    color: palette.textSecondary,
  },
  segmentedWrap: {
    width: '100%',
    marginTop: 24,
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    padding: 4,
    borderRadius: 999,
    gap: 4,
  },
  segmentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
  },
  segmentPillSelected: {
    backgroundColor: palette.obsidianPill,
  },
  segmentDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
  },
  segmentText: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  segmentTextSelected: {
    color: '#FFFFFF',
  },
  metricsCard: {
    padding: 20,
  },
  metricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  metricsTitle: {
    fontFamily: fontSans,
    fontSize: 16,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  metricsSub: {
    fontFamily: fontSans,
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricTile: {
    width: '48.5%',
    flexGrow: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.55)',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  metricName: {
    fontFamily: fontSans,
    fontSize: 11.5,
    color: palette.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: fontSans,
    fontSize: 14,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  privacyText: {
    flex: 1,
    fontFamily: fontSans,
    fontSize: 12,
    lineHeight: 17,
    color: palette.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.36)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dispatchCard: {
    width: '100%',
    maxWidth: 440,
    padding: 26,
  },
  dispatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dispatchBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.crimsonTint,
    borderWidth: 1,
    borderColor: palette.crimsonBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dispatchTag: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: '700',
    color: palette.crimsonDeep,
  },
  dispatchTitle: {
    fontFamily: fontSans,
    fontSize: 19,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  dispatchDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.65)',
    padding: 15,
    gap: 11,
    marginBottom: 20,
  },
  dispatchRow: {
    gap: 2,
  },
  dispatchKey: {
    fontFamily: fontSans,
    fontSize: 11.5,
    color: palette.textMuted,
  },
  dispatchVal: {
    fontFamily: fontSans,
    fontSize: 14,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  dismissLink: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  dismissLinkText: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: '500',
    color: palette.textSecondary,
  },
});
