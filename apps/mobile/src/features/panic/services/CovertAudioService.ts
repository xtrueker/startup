import { OfflineBufferService } from './OfflineBufferService';
import { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';

export class CovertAudioService {
  private static recording: any = null;
  private static isRecording = false;

  /**
   * Inicia el micrófono discretamente y lo encapsula en chunks de alta compresión.
   */
  static async startCovertRecording(alertId: string) {
    if (this.isRecording) return;
    
    try {
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== 'granted') return;

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true, // Evade el Switch de silencio
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
        await this.recording.stop();
        this.recording = null;
      } catch (e) {}
    }
    console.log('🎙️ [CovertAudio] Loop silencioso terminado.');
  }

  private static async recordChunk(alertId: string) {
    if (!this.isRecording) return;

    try {
      // Instanciar usando el módulo nativo y el preset de baja calidad (reemplazo de LOW_QUALITY)
      if (!AudioModule?.AudioRecorder) {
        console.warn('🎙️ [CovertAudio] AudioModule.AudioRecorder no está disponible en este entorno.');
        this.isRecording = false;
        return;
      }
      const options = RecordingPresets.LOW_QUALITY;
      this.recording = new AudioModule.AudioRecorder(options);
      
      await this.recording.prepareToRecordAsync();
      this.recording.record();

      // Esperar 30 Segundos
      setTimeout(async () => {
        if (!this.isRecording) return;
        
        try {
          await this.recording?.stop();
          const uri = this.recording?.uri;
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
