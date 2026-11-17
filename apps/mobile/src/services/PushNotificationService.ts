import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from './auth';

// Mostrar alertas críticas incluso con la app abierta en primer plano
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

class PushNotificationService {
  private currentToken: string | null = null;

  /**
   * Configura canal de sirena de prioridad máxima en Android (atraviesa No Molestar)
   * y registra el ExpoPushToken del dispositivo contra /api/mobile/push-token.
   */
  public async registerDevicePushToken(): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('rc-emergency-siren', {
          name: 'Despachos de Emergencia Crítica',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 400, 200, 400, 200, 600],
          lightColor: '#E11D48',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          sound: 'default',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId;

      const tokenResponse = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();

      const token = tokenResponse?.data;
      if (!token) return null;

      this.currentToken = token;
      await api.post('/mobile/push-token', {
        expoPushToken: token,
        platform: Platform.OS,
      });

      return token;
    } catch (err) {
      // En Expo Go sin credenciales FCM nativas no debe interrumpir el flujo
      console.log('[Push] Registro nativo omitido en entorno de desarrollo:', err);
      return null;
    }
  }

  public async unregisterDevicePushToken(): Promise<void> {
    if (!this.currentToken) return;
    try {
      await api.delete('/mobile/push-token', {
        data: { expoPushToken: this.currentToken },
      });
    } catch {
      // Ignore network error during logout
    } finally {
      this.currentToken = null;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
