import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authService } from './services/auth';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [view, setView] = useState<'login' | 'register'>('login');

  useEffect(() => {
    async function checkAuth() {
      try {
        const auth = await authService.isAuthenticated();
        setAuthenticated(auth);
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setChecking(false);
      }
    }
    checkAuth();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a202c', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#63b3ed" />
      </View>
    );
  }

  if (authenticated) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#1a202c" />
        <HomeScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1a202c" />
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
