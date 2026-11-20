import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { api } from '../services/auth';
import { config } from '../config';
import { panicService } from '../services/panicService';
import {
  palette,
  fontSans,
  glassSurfaceStyle,
  sculptedShadow,
} from '../theme/prismTheme';
import {
  LiquidGlassCard,
  LiquidPillButton,
  PrismIcon,
  StatusPill,
  TelemetryEqualizer,
} from './ui/PrismPrimitives';

export interface EvidenceClipItem {
  id: string;
  alertId: string;
  mimeType: string;
  chunkIndex: number;
  durationMs: number;
  byteSize: number;
  sha256Hash: string;
  url: string;
  createdAt: string;
}

export interface AlertEvidenceBundle {
  alertId: string;
  type: string;
  status: string;
  address: string;
  description: string;
  citizenName: string;
  createdAt: string;
  clipCount: number;
  clips: EvidenceClipItem[];
}

interface EvidenceVaultModalProps {
  visible: boolean;
  onClose: () => void;
  focusAlertId?: string | null;
}

function resolveStreamUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  return rawUrl.replace(/^https?:\/\/[^/]+/, config.API_URL);
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EvidenceVaultModal({
  visible,
  onClose,
  focusAlertId,
}: EvidenceVaultModalProps) {
  const [bundles, setBundles] = useState<AlertEvidenceBundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [bufferingClipId, setBufferingClipId] = useState<string | null>(null);

  const nativePlayerRef = useRef<any>(null);
  const nativeSubRef = useRef<any>(null);
  const webAudioRef = useRef<any>(null);
  const queueRef = useRef<EvidenceClipItem[]>([]);

  const stopPlayback = useCallback(() => {
    queueRef.current = [];
    setPlayingClipId(null);
    setBufferingClipId(null);

    if (nativeSubRef.current) {
      try {
        nativeSubRef.current.remove();
      } catch {}
      nativeSubRef.current = null;
    }

    if (nativePlayerRef.current) {
      try {
        nativePlayerRef.current.pause();
        nativePlayerRef.current.remove();
      } catch {}
      nativePlayerRef.current = null;
    }

    if (webAudioRef.current) {
      try {
        webAudioRef.current.pause();
        webAudioRef.current.src = '';
      } catch {}
      webAudioRef.current = null;
    }
  }, []);

  const loadVault = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/mobile/evidence/vault');
      const items: AlertEvidenceBundle[] = Array.isArray(res.data?.data)
        ? res.data.data
        : [];
      setBundles(items);

      if (focusAlertId) {
        setExpandedAlertId(focusAlertId);
      } else if (items.length > 0) {
        const firstWithAudio = items.find((b) => b.clips.length > 0) || items[0];
        setExpandedAlertId(firstWithAudio.alertId);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'No se pudieron cargar las grabaciones cifradas en este momento.'
      );
    } finally {
      setLoading(false);
    }
  }, [focusAlertId]);

  useEffect(() => {
    if (visible) {
      loadVault();
    } else {
      stopPlayback();
    }
    return () => {
      stopPlayback();
    };
  }, [visible, loadVault, stopPlayback]);

  const playClipInternal = useCallback(
    async (clip: EvidenceClipItem, remainingQueue: EvidenceClipItem[] = []) => {
      stopPlayback();
      queueRef.current = remainingQueue;
      setBufferingClipId(clip.id);

      const url = resolveStreamUrl(clip.url);

      const advanceQueueOrStop = () => {
        const next = queueRef.current.shift();
        if (next) {
          playClipInternal(next, [...queueRef.current]);
        } else {
          stopPlayback();
        }
      };

      if (Platform.OS === 'web') {
        try {
          const audio = new window.Audio(url);
          webAudioRef.current = audio;
          audio.onplaying = () => {
            setBufferingClipId(null);
            setPlayingClipId(clip.id);
          };
          audio.onended = advanceQueueOrStop;
          audio.onerror = () => {
            stopPlayback();
            setError('No se pudo reproducir este fragmento de audio.');
          };
          await audio.play();
        } catch {
          stopPlayback();
          setError('Tu navegador bloqueó la reproducción automática de audio.');
        }
        return;
      }

      try {
        const isAlertRecordingActive = panicService.getState().status === 'active';
        await setAudioModeAsync({
          allowsRecording: isAlertRecordingActive,
          playsInSilentMode: true,
        });

        const player = createAudioPlayer(url, {
          downloadFirst: true,
          updateInterval: 250,
        });
        nativePlayerRef.current = player;

        nativeSubRef.current = player.addListener('playbackStatusUpdate', (status: any) => {
          if (status?.playing) {
            setBufferingClipId(null);
            setPlayingClipId(clip.id);
          }
          if (status?.didJustFinish) {
            advanceQueueOrStop();
          }
        });

        player.play();
      } catch (e) {
        console.warn('[EvidenceVault] Error reproduciendo clip nativo:', e);
        stopPlayback();
        setError('Error al descifrar o reproducir el audio en el dispositivo.');
      }
    },
    [stopPlayback]
  );

  const handleToggleClip = (clip: EvidenceClipItem) => {
    if (playingClipId === clip.id || bufferingClipId === clip.id) {
      stopPlayback();
      return;
    }
    playClipInternal(clip, []);
  };

  const handlePlayAllBundle = (bundle: AlertEvidenceBundle) => {
    if (!bundle.clips || bundle.clips.length === 0) return;
    const isAlreadyPlayingThisBundle = bundle.clips.some(
      (c) => c.id === playingClipId || c.id === bufferingClipId
    );
    if (isAlreadyPlayingThisBundle) {
      stopPlayback();
      return;
    }
    const [first, ...rest] = bundle.clips;
    playClipInternal(first, rest);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        stopPlayback();
        onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, glassSurfaceStyle(32, true), sculptedShadow()]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCol}>
              <View style={styles.headerBadgeRow}>
                <PrismIcon name="waves" size={18} color={palette.aqua} />
                <Text style={styles.sheetTitle}>Bóveda de Audios SOS</Text>
              </View>
              <Text style={styles.sheetSub}>
                Evidencia acústica cifrada AES-256 con cadena de custodia SHA-256
              </Text>
            </View>

            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={loadVault}
                style={styles.iconPill}
                activeOpacity={0.75}
              >
                <PrismIcon name="refresh" size={15} color={palette.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  stopPlayback();
                  onClose();
                }}
                style={styles.closePill}
                activeOpacity={0.75}
              >
                <Text style={styles.closePillText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBar}>
              <PrismIcon name="alert" size={15} color={palette.crimson} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={palette.aqua} />
              <Text style={styles.loadingLabel}>
                Consultando grabaciones cifradas en Supabase...
              </Text>
            </View>
          ) : bundles.length === 0 ? (
            <View style={styles.centerBox}>
              <PrismIcon name="shield" size={32} color={palette.textMuted} />
              <Text style={styles.emptyTitle}>Sin grabaciones registradas aún</Text>
              <Text style={styles.emptySub}>
                Al activar una alerta SOS o Modo Silencioso, los fragmentos de 15 segundos quedan guardados aquí de forma cifrada para volverlos a escuchar.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {bundles.map((bundle) => {
                const isExpanded = expandedAlertId === bundle.alertId;
                const isBundlePlaying = bundle.clips.some(
                  (c) => c.id === playingClipId || c.id === bufferingClipId
                );

                return (
                  <LiquidGlassCard
                    key={bundle.alertId}
                    style={styles.bundleCard}
                    blurPx={24}
                  >
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={() =>
                        setExpandedAlertId(isExpanded ? null : bundle.alertId)
                      }
                      style={styles.bundleHeader}
                    >
                      <View style={styles.flex}>
                        <View style={styles.bundleTopBadges}>
                          <StatusPill
                            label={`${bundle.clips.length} ${
                              bundle.clips.length === 1 ? 'audio' : 'audios'
                            }`}
                            tone={bundle.clips.length > 0 ? 'aqua' : 'neutral'}
                          />
                          <Text style={styles.bundleDate}>
                            {formatDateTime(bundle.createdAt)}
                          </Text>
                        </View>
                        <Text style={styles.bundleAddress} numberOfLines={1}>
                          {bundle.address}
                        </Text>
                        <Text style={styles.bundleMeta} numberOfLines={1}>
                          Expediente #{bundle.alertId.slice(0, 8)} · {bundle.citizenName}
                        </Text>
                      </View>

                      {isBundlePlaying ? (
                        <TelemetryEqualizer color={palette.crimson} active />
                      ) : null}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.clipsContainer}>
                        {bundle.clips.length === 0 ? (
                          <Text style={styles.noClipsHint}>
                            Esta alerta se cerró antes de completar el primer fragmento de 15 segundos.
                          </Text>
                        ) : (
                          <>
                            {bundle.clips.length > 1 && (
                              <LiquidPillButton
                                label={
                                  isBundlePlaying
                                    ? 'Detener reproducción continua'
                                    : `Escuchar todos seguidos (${bundle.clips.length} clips)`
                                }
                                variant={isBundlePlaying ? 'crimson' : 'obsidian'}
                                size="sm"
                                icon="waves"
                                iconPosition="left"
                                onPress={() => handlePlayAllBundle(bundle)}
                                style={{ marginBottom: 8 }}
                              />
                            )}

                            {bundle.clips.map((clip, idx) => {
                              const isPlaying = playingClipId === clip.id;
                              const isBuffering = bufferingClipId === clip.id;
                              const secs = Math.round(
                                (clip.durationMs || config.AUDIO_CHUNK_DURATION_MS) / 1000
                              );

                              return (
                                <View
                                  key={clip.id}
                                  style={[
                                    styles.clipRow,
                                    isPlaying && styles.clipRowActive,
                                  ]}
                                >
                                  <View style={styles.clipInfo}>
                                    <Text style={styles.clipTitle}>
                                      Fragmento #{idx + 1} · {secs}s ({formatBytes(clip.byteSize)})
                                    </Text>
                                    <Text style={styles.clipHash} numberOfLines={1}>
                                      SHA-256: {clip.sha256Hash.slice(0, 20)}... ·{' '}
                                      {formatDateTime(clip.createdAt)}
                                    </Text>
                                  </View>

                                  <TouchableOpacity
                                    onPress={() => handleToggleClip(clip)}
                                    activeOpacity={0.8}
                                    style={[
                                      styles.playPill,
                                      isPlaying && styles.playPillActive,
                                    ]}
                                  >
                                    {isBuffering ? (
                                      <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                      <Text style={styles.playPillText}>
                                        {isPlaying ? 'Pausar' : 'Escuchar'}
                                      </Text>
                                    )}
                                  </TouchableOpacity>
                                </View>
                              );
                            })}
                          </>
                        )}
                      </View>
                    )}
                  </LiquidGlassCard>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.36)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '86%',
    minHeight: '52%',
    backgroundColor: 'rgba(246, 248, 252, 0.96)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  flex: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  headerTitleCol: {
    flex: 1,
    gap: 3,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontFamily: fontSans,
    fontSize: 19,
    fontWeight: '700',
    color: palette.textPrimary,
    letterSpacing: -0.4,
  },
  sheetSub: {
    fontFamily: fontSans,
    fontSize: 12,
    color: palette.textSecondary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePill: {
    paddingHorizontal: 13,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.obsidianPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePillText: {
    fontFamily: fontSans,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.crimsonTint,
    borderColor: palette.crimsonBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  errorText: {
    flex: 1,
    fontFamily: fontSans,
    fontSize: 12.5,
    color: palette.crimsonDeep,
  },
  centerBox: {
    paddingVertical: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingLabel: {
    fontFamily: fontSans,
    fontSize: 13,
    color: palette.textSecondary,
  },
  emptyTitle: {
    fontFamily: fontSans,
    fontSize: 16,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  emptySub: {
    fontFamily: fontSans,
    fontSize: 13,
    color: palette.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    gap: 12,
    paddingBottom: 18,
  },
  bundleCard: {
    padding: 15,
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bundleTopBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  bundleDate: {
    fontFamily: fontSans,
    fontSize: 11.5,
    color: palette.textMuted,
    fontWeight: '600',
  },
  bundleAddress: {
    fontFamily: fontSans,
    fontSize: 14.5,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  bundleMeta: {
    fontFamily: fontSans,
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
  clipsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.55)',
    gap: 8,
  },
  noClipsHint: {
    fontFamily: fontSans,
    fontSize: 12.5,
    color: palette.textMuted,
  },
  clipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clipRowActive: {
    borderColor: palette.crimson,
    backgroundColor: 'rgba(255, 241, 242, 0.9)',
  },
  clipInfo: {
    flex: 1,
    gap: 2,
  },
  clipTitle: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  clipHash: {
    fontFamily: fontSans,
    fontSize: 10.5,
    color: palette.textMuted,
  },
  playPill: {
    minWidth: 82,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: palette.obsidianPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPillActive: {
    backgroundColor: palette.crimson,
  },
  playPillText: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
