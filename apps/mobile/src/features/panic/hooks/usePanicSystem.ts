import { useState } from 'react';
import { Alert, Vibration, Platform } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../../../services/auth';
import { CovertAudioService } from '../services/CovertAudioService';
import { OfflineBufferService } from '../services/OfflineBufferService';

export function usePanicSystem() {
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'active' | 'cancelling'>('idle');
  const [loading, setLoading] = useState(false);

  const triggerPanic = async (referenceLocation?: Location.LocationObjectCoords | null) => {
    setLoading(true);
    try {
      Vibration.vibrate(Platform.OS === 'android' ? [0, 200, 100, 200] : 400);

      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      let latitude = referenceLocation?.latitude || 0;
      let longitude = referenceLocation?.longitude || 0;
      let address = 'Ubicación Desconocida';

      if (locStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;

        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        address = geo ? `${geo.street || ''} ${geo.city || ''}`.trim() : address;
      }

      const payload = {
        latitude,
        longitude,
        address,
        description: 'Pánico activado desde mapa interactivo',
      };

      try {
        // High-connectivity sync
        const res = await api.post('/mobile/panic', payload);
        const alertId = res.data.data.alertId;
        setActiveAlertId(alertId);
        setStatus('active');
        
        // Empezar grabación encubierta
        CovertAudioService.startCovertRecording(alertId);
        
      } catch (apiError) {
        // Offline Fallback - Guardar evidencia local para envío diferido
        console.warn('Network API falló, encolando alerta de emergencia localmente.');
        await OfflineBufferService.enqueue('PANIC_TRIGGER', payload);
        
        // Simular ID local para mantener el flujo de audio
        const mockAlertId = `LOCAL_BUFFER_${Date.now()}`;
        setActiveAlertId(mockAlertId);
        setStatus('active');
        
        CovertAudioService.startCovertRecording(mockAlertId);
        Alert.alert('Modo Offline', 'Se perdió la conexión. Su alerta y audio se transmitirán tan pronto intercepte señal.');
      }

    } catch (e: any) {
      Alert.alert('Error Fatal', 'No se pudo acceder a los sensores del dispositivo.');
    } finally {
      setLoading(false);
    }
  };

  const cancelAlert = async () => {
    if (!activeAlertId) return;
    setStatus('cancelling');
    try {
      if (!activeAlertId.startsWith('LOCAL_BUFFER')) {
        await api.patch(`/mobile/alerts/${activeAlertId}/cancel`);
      }
      setActiveAlertId(null);
      setStatus('idle');
      
      // Apagar micrófonos y detener grabación
      await CovertAudioService.stopCovertRecording();
      
    } catch (e) {
      Alert.alert('Error', 'No se pudo cancelar la alerta en la red.');
      setStatus('active');
    }
  };

  return { activeAlertId, status, loading, triggerPanic, cancelAlert };
}
