import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { OfflineBufferService } from './OfflineBufferService';

export class CovertAudioService {
  private static recording: Audio.Recording | null = null;
  private static isRecording = false;

  /**
   * Inicia el micrófono discretamente y lo encapsula en chunks de alta compresión.
   */
  static async startCovertRecording(alertId: string) {
    if (this.isRecording) return;
    
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true, // Evade el Switch de silencio
      });

      console.log('🎙️ [CovertAudio] Grabación oscura iniciada...');
      this.isRecording = true;

      // Iniciar el Recording Loop (Chunks de 30 segundos)
      this.recordChunk(alertId);

    } catch (err) {
      console.error('Fallo iniciando Stealth Mic', err);
    }
  }

  static async stopCovertRecording() {
    this.isRecording = false;
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      } catch (e) {}
    }
    console.log('🎙️ [CovertAudio] Loop silencioso terminado.');
  }

  private static async recordChunk(alertId: string) {
    if (!this.isRecording) return;

    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY // Formato de alta compresión celular
      );
      this.recording = recording;

      // Esperar 30 Segundos
      setTimeout(async () => {
        if (!this.isRecording) return;
        
        try {
          await this.recording?.stopAndUnloadAsync();
          const uri = this.recording?.getURI();
          this.recording = null;

          if (uri) {
            console.log(`🎙️ [CovertAudio] Chunk cerrado: ${uri}`);
            // Empujar al Offline Queue para ser subido vía presigned Urls de AWS S3
            await OfflineBufferService.enqueue('AUDIO_CHUNK', {
              alertId,
              fileUri: uri,
            });
          }
          
          // Grabar la siguiente ventana (Loop infinito hasta cancelar Alarma)
          this.recordChunk(alertId);

        } catch (err) {
          console.error('Error cerrando chunk de audio', err);
        }
      }, 30000); // Guardar evidencia cada 30 segundos

    } catch (err) {
      console.error('Error abriendo chunk de audio', err);
    }
  }
}
