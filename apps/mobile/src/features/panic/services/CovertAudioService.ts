import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { api } from '../../../services/auth';
import { OfflineBufferService } from './OfflineBufferService';

const CHUNK_DURATION_MS = 15000;

export class CovertAudioService {
  private static recording: any = null;
  private static webMediaRecorder: any = null;
  private static webStream: any = null;
  private static isRecording = false;
  private static activeAlertId: string | null = null;
  private static discardOnStop = false;
  private static chunkCounter = 0;
  private static chunkTimeout: ReturnType<typeof setTimeout> | null = null;

  static updateActiveAlertId(newAlertId: string) {
    if (this.isRecording && newAlertId) {
      this.activeAlertId = newAlertId;
    }
  }

  /**
   * Inicia captura acústica discreta en fragmentos de 15s (iOS, Android y Web)
   * y los transmite cifrados a /api/mobile/evidence/audio (con cola offline de respaldo).
   */
  static async startCovertRecording(alertId: string) {
    if (this.isRecording) return;
    this.activeAlertId = alertId;
    this.discardOnStop = false;
    this.chunkCounter = 0;

    if (Platform.OS === 'web') {
      await this.startWebRecording(alertId);
      return;
    }

    try {
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== 'granted') return;

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      this.isRecording = true;
      this.recordNativeChunk(alertId);
    } catch (err) {
      console.warn('[CovertAudio] No se pudo iniciar micrófono nativo:', err);
    }
  }

  static async stopCovertRecording(options?: { discardFinalChunk?: boolean }) {
    const discard = Boolean(options?.discardFinalChunk);
    this.isRecording = false;
    this.discardOnStop = discard;
    if (this.chunkTimeout) {
      clearTimeout(this.chunkTimeout);
      this.chunkTimeout = null;
    }

    if (Platform.OS === 'web') {
      try {
        if (this.webMediaRecorder && this.webMediaRecorder.state !== 'inactive') {
          this.webMediaRecorder.stop();
        }
        if (this.webStream) {
          this.webStream.getTracks().forEach((t: any) => t.stop());
        }
      } catch {
        // Ignore cleanup errors
      }
      this.webMediaRecorder = null;
      this.webStream = null;
      this.activeAlertId = null;
      return;
    }

    if (this.recording) {
      const pendingAlertId = this.activeAlertId;
      const finalIdx = this.chunkCounter++;
      const finalRecorder = this.recording;
      this.recording = null;
      this.activeAlertId = null;

      try {
        await finalRecorder.stop();
        const uri = finalRecorder.uri;
        if (discard) {
          if (uri) {
            FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
          }
          return;
        }
        if (uri && pendingAlertId) {
          await this.transmitOrBufferAudio({
            alertId: pendingAlertId,
            fileUri: uri,
            mimeType: 'audio/mp4',
            chunkIndex: finalIdx,
          });
        }
      } catch {
        // Ignore stop errors
      }
      return;
    }
    this.activeAlertId = null;
  }

  private static async transmitOrBufferAudio(params: {
    alertId: string;
    audioBase64?: string;
    fileUri?: string;
    mimeType: string;
    chunkIndex: number;
  }) {
    const { fileUri, mimeType, chunkIndex } = params;
    const alertId = OfflineBufferService.resolveAlertId(params.alertId) || params.alertId;
    let audioBase64 = params.audioBase64;

    // Si la alerta empezó sin red, encolar directamente hasta que tenga UUID real
    if (OfflineBufferService.isTemporaryAlertId(alertId)) {
      await OfflineBufferService.enqueue('AUDIO_CHUNK', {
        alertId,
        audioBase64,
        fileUri,
        mimeType,
        chunkIndex,
        durationMs: CHUNK_DURATION_MS,
      });
      return;
    }

    try {
      if (!audioBase64 && fileUri && Platform.OS !== 'web') {
        audioBase64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      if (!audioBase64) return;

      await api.post('/mobile/evidence/audio', {
        alertId,
        audioBase64,
        mimeType,
        chunkIndex,
        durationMs: CHUNK_DURATION_MS,
      });

      if (fileUri && Platform.OS !== 'web') {
        FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
      }
    } catch {
      await OfflineBufferService.enqueue('AUDIO_CHUNK', {
        alertId,
        audioBase64,
        fileUri,
        mimeType,
        chunkIndex,
        durationMs: CHUNK_DURATION_MS,
      });
    }
  }

  private static async recordNativeChunk(alertId: string) {
    if (!this.isRecording) return;

    try {
      if (!AudioModule?.AudioRecorder) {
        this.isRecording = false;
        return;
      }

      const recorder = new AudioModule.AudioRecorder(RecordingPresets.LOW_QUALITY);
      this.recording = recorder;

      await recorder.prepareToRecordAsync();
      recorder.record();

      this.chunkTimeout = setTimeout(async () => {
        if (!this.isRecording) return;
        const currentIdx = this.chunkCounter++;

        try {
          await recorder.stop();
          const uri = recorder.uri;
          this.recording = null;

          const targetAlertId = this.activeAlertId || alertId;
          if (uri) {
            await this.transmitOrBufferAudio({
              alertId: targetAlertId,
              fileUri: uri,
              mimeType: 'audio/mp4',
              chunkIndex: currentIdx,
            });
          }

          if (this.isRecording) {
            this.recordNativeChunk(this.activeAlertId || targetAlertId);
          }
        } catch (err) {
          console.warn('[CovertAudio] Error cerrando fragmento nativo:', err);
        }
      }, CHUNK_DURATION_MS);
    } catch (err) {
      console.warn('[CovertAudio] Error grabando fragmento nativo:', err);
    }
  }

  private static async startWebRecording(alertId: string) {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.webStream = stream;
      this.isRecording = true;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const launchWebSegment = () => {
        if (!this.isRecording || !this.webStream) return;
        const recorder = new MediaRecorder(this.webStream, { mimeType });
        this.webMediaRecorder = recorder;
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (ev: any) => {
          if (ev.data && ev.data.size > 0) chunks.push(ev.data);
        };

        recorder.onstop = () => {
          if (this.discardOnStop || chunks.length === 0) return;
          const targetAlertId = this.activeAlertId || alertId;
          const idx = this.chunkCounter++;
          const blob = new Blob(chunks, { type: mimeType });
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              this.transmitOrBufferAudio({
                alertId: targetAlertId,
                audioBase64: reader.result,
                mimeType: 'audio/webm',
                chunkIndex: idx,
              }).catch(() => {});
            }
          };
          reader.readAsDataURL(blob);
        };

        recorder.start();
        this.chunkTimeout = setTimeout(() => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
          if (this.isRecording) {
            launchWebSegment();
          }
        }, CHUNK_DURATION_MS);
      };

      launchWebSegment();
    } catch {
      // Mic permission denied or unavailable on web
      this.isRecording = false;
    }
  }
}
