import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Vibration,
  Animated,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { patrolService, PatrolState, PatrolStatus, TacticalDispatch } from '../services/PatrolService';

interface PatrolModeScreenProps {
  onBack?: () => void;
  onLogout?: () => void;
  isDedicatedOfficer?: boolean;
}

const STATUS_CONFIG: Record<PatrolStatus, { label: string; color: string; icon: string }> = {
  off_duty: { label: 'Fuera de Servicio', color: '#64748B', icon: '⏸️' },
  available: { label: 'Disponible', color: '#10B981', icon: '🟢' },
  responding: { label: 'Respondiendo Alerta', color: '#F59E0B', icon: '🚨' },
  busy: { label: 'Ocupado', color: '#EF4444', icon: '🔴' },
};

export default function PatrolModeScreen({ onBack, onLogout, isDedicatedOfficer = false }: PatrolModeScreenProps) {
  const [state, setState] = useState<PatrolState>(patrolService.getState());
  const [loading, setLoading] = useState(false);
  const [activeDispatch, setActiveDispatch] = useState<TacticalDispatch | null>(null);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const unsub = patrolService.subscribe(setState);

    // Auto-iniciar patrullaje de inmediato al ingresar el oficial si está fuera de servicio
    if (!patrolService.getState().isActive) {
      patrolService.startPatrol().catch((err) => {
        console.warn('Auto-start patrol failed:', err);
      });
    }

    // Escuchar despachos de emergencia entrantes desde el Centro de Mando
    const unsubDispatch = patrolService.onDispatch((dispatch) => {
      setActiveDispatch(dispatch);
      // Vibración de alarma táctica continua
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    });

    return () => {
      unsub();
      unsubDispatch();
    };
  }, []);

  // Trazar la ruta más rápida hacia el punto del ciudadano
  const handleOpenFastestRoute = (dispatch: TacticalDispatch) => {
    patrolService.setStatus('responding');
    const { latitude, longitude, citizenName } = dispatch;

    // Abrir la mejor aplicación de navegación táctica con ruta directa
    const label = encodeURIComponent(`🚨 Auxilio: ${citizenName}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
      });
    }
  };

  // Pulso visual cuando está activo
  useEffect(() => {
    if (state.isActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [state.isActive]);

  const handleTogglePatrol = async () => {
    if (state.isActive) {
      Alert.alert(
        '🚔 Finalizar Patrulla',
        '¿Deseas finalizar tu turno de patrullaje? Tu ubicación dejará de transmitirse al Centro de Mando.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Finalizar Turno',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              await patrolService.stopPatrol();
              Vibration.vibrate(200);
              setLoading(false);
            },
          },
        ]
      );
    } else {
      setLoading(true);
      const success = await patrolService.startPatrol();
      if (success) {
        Vibration.vibrate([0, 100, 50, 100]);
      } else {
        Alert.alert('Error', state.errorMessage || 'No se pudo iniciar la patrulla.');
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
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatSpeed = (ms: number | null) => {
    if (ms === null || ms < 0) return '0 km/h';
    return `${Math.round(ms * 3.6)} km/h`;
  };

  const currentConfig = STATUS_CONFIG[state.status];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {isDedicatedOfficer ? (
          <TouchableOpacity onPress={onLogout} style={[styles.backBtn, { backgroundColor: '#7F1D1D' }]}>
            <Text style={[styles.backBtnText, { color: '#FCA5A5' }]}>Cerrar Sesión</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Volver</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>🚔 Terminal Táctica Policial</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Estado Actual */}
      <View style={[styles.statusBanner, { borderColor: currentConfig.color }]}>
        <Text style={{ fontSize: 28 }}>{currentConfig.icon}</Text>
        <Text style={[styles.statusText, { color: currentConfig.color }]}>{currentConfig.label}</Text>
      </View>

      {/* Botón Principal */}
      <View style={styles.mainButtonArea}>
        <Animated.View style={{ transform: [{ scale: state.isActive ? pulseAnim : 1 }] }}>
          <TouchableOpacity
            style={[
              styles.patrolButton,
              state.isActive ? styles.patrolButtonActive : styles.patrolButtonInactive,
            ]}
            onPress={handleTogglePatrol}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <Text style={styles.patrolButtonIcon}>⏳</Text>
            ) : (
              <Text style={styles.patrolButtonIcon}>{state.isActive ? '🛑' : '🚔'}</Text>
            )}
            <Text style={styles.patrolButtonText}>
              {loading ? 'Procesando...' : state.isActive ? 'FINALIZAR TURNO' : 'INICIAR PATRULLA'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Selectores de Estado (solo cuando está activo) */}
      {state.isActive && (
        <View style={styles.statusSelector}>
          <Text style={styles.sectionTitle}>Estado de Patrulla:</Text>
          <View style={styles.statusGrid}>
            {(['available', 'responding', 'busy'] as PatrolStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              const isSelected = state.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusOption,
                    isSelected && { borderColor: cfg.color, backgroundColor: `${cfg.color}22` },
                  ]}
                  onPress={() => handleStatusChange(s)}
                >
                  <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
                  <Text style={[styles.statusOptionText, isSelected && { color: cfg.color }]}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Telemetría GPS */}
      {state.isActive && (
        <View style={styles.telemetryCard}>
          <Text style={styles.sectionTitle}>📡 Telemetría GPS en Vivo</Text>
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Latitud</Text>
              <Text style={styles.telemetryValue}>{state.latitude?.toFixed(6) ?? '--'}</Text>
            </View>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Longitud</Text>
              <Text style={styles.telemetryValue}>{state.longitude?.toFixed(6) ?? '--'}</Text>
            </View>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Velocidad</Text>
              <Text style={styles.telemetryValue}>{formatSpeed(state.speed)}</Text>
            </View>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Precisión</Text>
              <Text style={styles.telemetryValue}>{state.accuracy ? `±${Math.round(state.accuracy)}m` : '--'}</Text>
            </View>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Inicio Turno</Text>
              <Text style={styles.telemetryValue}>{formatTime(state.startedAt)}</Text>
            </View>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Última Actualización</Text>
              <Text style={styles.telemetryValue}>{formatTime(state.lastUpdate)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Nota de privacidad */}
      <View style={styles.privacyNote}>
        <Text style={styles.privacyText}>
          🔒 Tu ubicación se transmite exclusivamente al Centro de Mando. Los ciudadanos NO pueden ver tu posición.
        </Text>
      </View>

      {/* 🚨 MODAL DE DESPACHO TÁCTICO DE EMERGENCIA */}
      <Modal
        visible={!!activeDispatch}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveDispatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dispatchCard}>
            <View style={styles.dispatchHeader}>
              <Text style={styles.dispatchIcon}>🚨</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.dispatchAlertTag}>DESPACHO TÁCTICO INMEDIATO</Text>
                <Text style={styles.dispatchType}>{activeDispatch?.emergencyType || 'EMERGENCIA CIUDADANA'}</Text>
              </View>
            </View>

            <View style={styles.dispatchBody}>
              <Text style={styles.dispatchLabel}>Ciudadano en Peligro:</Text>
              <Text style={styles.dispatchValue}>{activeDispatch?.citizenName}</Text>

              <Text style={styles.dispatchLabel}>Ubicación / Dirección:</Text>
              <Text style={styles.dispatchValue}>{activeDispatch?.address || `Coordenadas: ${activeDispatch?.latitude.toFixed(5)}, ${activeDispatch?.longitude.toFixed(5)}`}</Text>

              {activeDispatch?.notes ? (
                <>
                  <Text style={styles.dispatchLabel}>Instrucciones del Comando:</Text>
                  <Text style={[styles.dispatchValue, { color: '#FDE68A' }]}>{activeDispatch.notes}</Text>
                </>
              ) : null}
            </View>

            <View style={styles.dispatchActions}>
              <TouchableOpacity
                style={styles.acceptRouteBtn}
                onPress={() => {
                  if (activeDispatch) {
                    handleOpenFastestRoute(activeDispatch);
                    setActiveDispatch(null);
                  }
                }}
              >
                <Text style={styles.acceptRouteBtnText}>🧭 ACEPTAR Y TRAZAR RUTA MÁS RÁPIDA</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dismissDispatchBtn}
                onPress={() => setActiveDispatch(null)}
              >
                <Text style={styles.dismissDispatchText}>Ignorar por ahora</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  mainButtonArea: {
    alignItems: 'center',
    marginVertical: 24,
  },
  patrolButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  patrolButtonInactive: {
    backgroundColor: '#1E293B',
    borderColor: '#38BDF8',
  },
  patrolButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  patrolButtonIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  patrolButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusSelector: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0F172A',
    gap: 4,
  },
  statusOptionText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  telemetryCard: {
    marginHorizontal: 20,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  telemetryItem: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
  },
  telemetryLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  telemetryValue: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  privacyNote: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  privacyText: {
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dispatchCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  dispatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.3)',
  },
  dispatchIcon: {
    fontSize: 36,
  },
  dispatchAlertTag: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  dispatchType: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dispatchBody: {
    marginBottom: 20,
  },
  dispatchLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  dispatchValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  dispatchActions: {
    gap: 10,
  },
  acceptRouteBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptRouteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dismissDispatchBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissDispatchText: {
    color: '#64748B',
    fontSize: 12,
  },
});
