import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

interface GhostModeScreenProps {
  onDeactivate: (shouldCancelAlert?: boolean) => void;
}

export function GhostModeScreen({ onDeactivate }: GhostModeScreenProps) {
  // Rastreo de puntos táctiles para el patrón "Z" secreto
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [tapCount, setTapCount] = useState<number>(0);
  const [lastTapTime, setLastTapTime] = useState<number>(0);

  const handleGestureEvent = (event: any) => {
    const { x, y } = event.nativeEvent;
    setPoints((prev) => [...prev, { x, y }]);
  };

  const handleGestureStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      evaluatePattern(points);
      setPoints([]);
    }
  };

  const evaluatePattern = (path: { x: number; y: number }[]) => {
    if (path.length < 8) return;

    const first = path[0];
    const last = path[path.length - 1];

    const distanceX = Math.abs(first.x - last.x);
    const distanceY = Math.abs(first.y - last.y);

    // Si el trazo cubre un área diagonal significativa (gesto Z o diagonal de escape)
    if (distanceX > 80 && distanceY > 80) {
      unlockStealthMode();
    }
  };

  // Método de respaldo sigiloso: 4 toques rápidos en la esquina inferior derecha
  const handleDiscreteCornerTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 600) {
      const newCount = tapCount + 1;
      if (newCount >= 4) {
        unlockStealthMode();
        setTapCount(0);
      } else {
        setTapCount(newCount);
      }
    } else {
      setTapCount(1);
    }
    setLastTapTime(now);
  };

  const unlockStealthMode = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
    onDeactivate(false);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Ocultar barra de estado completamente (pantalla en negro absoluto OLED) */}
      <StatusBar hidden={true} />

      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleGestureStateChange}
      >
        <View style={styles.blackHole}>
          {/* Esquina invisible de respaldo para desbloquear sin gestos complejos */}
          <TouchableOpacity
            style={styles.hiddenEscapeZone}
            onPress={handleDiscreteCornerTap}
            activeOpacity={1}
          />
        </View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  blackHole: {
    flex: 1,
    backgroundColor: '#000000',
    width,
    height,
  },
  hiddenEscapeZone: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 80,
    height: 80,
    backgroundColor: 'transparent',
  },
});
