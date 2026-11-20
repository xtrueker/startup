import { useEffect, useState } from 'react';
import { Vibration, Platform } from 'react-native';
import * as Location from 'expo-location';
import { panicService, PanicState } from '../../../services/panicService';
import { showAlert } from '../../../utils/dialogs';

export function usePanicSystem() {
  const [panicState, setPanicState] = useState<PanicState>(() => panicService.getState());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = panicService.subscribe((nextState) => {
      setPanicState(nextState);
    });
    return unsubscribe;
  }, []);

  const triggerPanic = async (referenceLocation?: Location.LocationObjectCoords | null) => {
    setLoading(true);
    try {
      Vibration.vibrate(Platform.OS === 'android' ? [0, 200, 100, 200] : 400);

      const nextState = await panicService.sendPanicAlert({
        triggerType: 'button',
        description: 'Pánico activado desde mapa interactivo',
        customCoords: referenceLocation
          ? {
              latitude: referenceLocation.latitude,
              longitude: referenceLocation.longitude,
            }
          : undefined,
      });

      if (nextState.isOffline) {
        showAlert(
          'Modo Offline',
          'Se perdió la conexión. Su alerta y audio se transmitirán tan pronto intercepte señal.'
        );
      }
    } catch {
      showAlert('Error Fatal', 'No se pudo acceder a los sensores del dispositivo.');
    } finally {
      setLoading(false);
    }
  };

  const cancelAlert = async () => {
    if (!panicState.alertId) return;
    try {
      await panicService.cancelPanicAlert();
    } catch {
      showAlert('Error', 'No se pudo cancelar la alerta en la red.');
    }
  };

  const normalizedStatus: 'idle' | 'active' | 'cancelling' =
    panicState.status === 'cancelling'
      ? 'cancelling'
      : panicState.status === 'active' || panicState.status === 'triggering'
        ? 'active'
        : 'idle';

  return {
    activeAlertId: panicState.alertId,
    status: normalizedStatus,
    loading: loading || panicState.status === 'triggering',
    triggerPanic,
    cancelAlert,
  };
}
