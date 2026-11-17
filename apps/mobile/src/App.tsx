import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authService } from './services/auth';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import PatrolModeScreen from './screens/PatrolModeScreen';

import { ghostModeService } from './services/GhostModeService';
import { GhostModeScreen } from './screens/GhostModeScreen';
import { panicService } from './services/panicService';
import { localDatabase } from './services/localDatabase';
import { palette, fontSans } from './theme/prismTheme';
import { AmbientPrismCanvas, PrismEmblem } from './components/ui/PrismPrimitives';

export default function App() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [view, setView] = useState<'login' | 'register'>('login');
  const [activeScreen, setActiveScreen] = useState<'home' | 'patrol'>('home');

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

    ghostModeService.startListening();

    ghostModeService.setOnTriggered(async (event) => {
      console.log('Modo silencioso activado por botones físicos:', event.sequence);
      setIsGhostModeActive(true);

      try {
        await panicService.sendPanicAlert({
          triggerType: 'ghost_mode',
          description: `PÁNICO SIGILOSO (Modo Fantasma): Detonado por secuencia de volumen [${event.sequence.join(', ')}]`,
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
        <AmbientPrismCanvas intensity="subtle" />
        <PrismEmblem size={54} />
        <ActivityIndicator
          size="small"
          color={palette.obsidianPill}
          style={{ marginTop: 18 }}
        />
        <Text style={styles.bootText}>Preparando tu espacio seguro...</Text>
      </View>
    );
  }

  // Modo silencioso: pantalla OLED completamente negra (#000000) por seguridad encubierta
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
        <StatusBar barStyle="dark-content" />
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
      <StatusBar barStyle="dark-content" />
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
    backgroundColor: palette.canvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bootText: {
    marginTop: 12,
    fontFamily: fontSans,
    fontSize: 13.5,
    fontWeight: '500',
    color: palette.textSecondary,
  },
});
