import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authService } from './services/auth';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import PatrolModeScreen from './screens/PatrolModeScreen';

// Modo Fantasma y Servicio de Pánico
import { ghostModeService } from './services/GhostModeService';
import { GhostModeScreen } from './screens/GhostModeScreen';
import { panicService } from './services/panicService';
import { localDatabase } from './services/localDatabase';

export default function App() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [view, setView] = useState<'login' | 'register'>('login');
  const [activeScreen, setActiveScreen] = useState<'home' | 'patrol'>('home');

  // Estado global de Intercepción Táctica (Modo Fantasma)
  const [isGhostModeActive, setIsGhostModeActive] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        await localDatabase.init();
        const auth = await authService.isAuthenticated();
        setAuthenticated(auth);
        if (auth) {
          const profile = await authService.getProfile();
          const role = profile?.role || null;
          setUserRole(role);
          if (role === 'police') {
            setActiveScreen('patrol');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setChecking(false);
      }
    }
    checkAuth();

    // Suscribirse reactivamente a cambios de autenticación (Login / Logout / 401 Expirado)
    const unsubscribeAuth = authService.subscribe(async (isAuth) => {
      setAuthenticated(isAuth);
      if (!isAuth) {
        setUserRole(null);
        setActiveScreen('home');
        setView('login');
      } else {
        const profile = await authService.getProfile();
        const role = profile?.role || null;
        setUserRole(role);
        if (role === 'police') {
          setActiveScreen('patrol');
        }
      }
    });

    // Iniciar la escucha pasiva del acorde de botones físicos de volumen
    ghostModeService.startListening();

    // Conectar el listener del Modo Fantasma para obtener geolocalización y disparar HTTP POST
    ghostModeService.setOnTriggered(async (event) => {
      console.log('👻 [App] ¡Modo Fantasma detonado por botones físicos!', event.sequence);
      setIsGhostModeActive(true);

      try {
        // Disparo de alerta de pánico sigilosa al backend con GPS de alta precisión
        await panicService.sendPanicAlert({
          triggerType: 'ghost_mode',
          description: `🚨 PÁNICO SIGILOSO (Modo Fantasma): Detonado por secuencia de volumen [${event.sequence.join(', ')}]`,
        });
      } catch (panicErr) {
        console.error('[App] Error al despachar pánico en modo fantasma:', panicErr);
      }
    });

    return () => {
      unsubscribeAuth();
      ghostModeService.stopListening();
    };
  }, []);

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  // Si el Modo Fantasma está detonado, secuestramos todo el renderizado con la pantalla negra táctica
  if (isGhostModeActive) {
    return (
      <GhostModeScreen
        onDeactivate={async (shouldCancelAlert = false) => {
          setIsGhostModeActive(false);
          if (shouldCancelAlert) {
            await panicService.cancelPanicAlert();
          }
        }}
      />
    );
  }

  if (authenticated) {
    const isPolice = userRole === 'police';

    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0A0E17" />
        {activeScreen === 'patrol' ? (
          <PatrolModeScreen
            isDedicatedOfficer={isPolice}
            onBack={() => setActiveScreen('home')}
            onLogout={async () => {
              await authService.logout();
              setAuthenticated(false);
              setUserRole(null);
              setActiveScreen('home');
              setView('login');
            }}
          />
        ) : (
          <HomeScreen
            onLogout={() => {
              setAuthenticated(false);
              setUserRole(null);
              setActiveScreen('home');
              setView('login');
            }}
            onOpenPatrol={() => setActiveScreen('patrol')}
          />
        )}
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E17" />
      {view === 'login' ? (
        <LoginScreen
          onLogin={() => setAuthenticated(true)}
          onGoRegister={() => setView('register')}
        />
      ) : (
        <RegisterScreen
          onRegister={() => setAuthenticated(true)}
          onGoLogin={() => setView('login')}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0E17',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
