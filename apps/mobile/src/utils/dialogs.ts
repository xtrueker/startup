import { Alert, Platform } from 'react-native';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  webMessage?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

/**
 * Muestra una alerta modal nativa en iOS/Android o window.alert en Web (cuando webAlert=true).
 */
export function showAlert(
  title: string,
  message: string,
  options?: { buttonText?: string; showOnWeb?: boolean }
): void {
  const showOnWeb = options?.showOnWeb ?? true;
  if (Platform.OS === 'web') {
    if (showOnWeb && typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message);
    }
    return;
  }

  Alert.alert(
    title,
    message,
    options?.buttonText ? [{ text: options.buttonText }] : undefined
  );
}

/**
 * Solicita confirmación multiplataforma (Alert.alert nativo en iOS/Android y window.confirm en Web).
 */
export function confirmAction({
  title,
  message,
  webMessage,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  destructive = false,
}: ConfirmDialogOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ok =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(webMessage || message)
        : true;
    return Promise.resolve(ok);
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: cancelText,
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: confirmText,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
