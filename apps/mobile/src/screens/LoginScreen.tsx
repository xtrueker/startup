import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../services/auth';

interface LoginScreenProps {
  onLogin: () => void;
  onGoRegister: () => void;
}

export default function LoginScreen({ onLogin, onGoRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu email y contraseña');
      return;
    }
    setLoading(true);
    try {
      await authService.login({ email: email.trim().toLowerCase(), password });
      onLogin();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Credenciales incorrectas';
      Alert.alert('Error de acceso', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0E17' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.logo}>🛡️</Text>
          <Text style={styles.appName}>Red Ciudadana</Text>
          <Text style={styles.appSub}>Sistema de Seguridad</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Iniciar Sesión</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#718096"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#718096"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginBtnText}>Ingresar</Text>
            )}
          </TouchableOpacity>

          {/* Botón de acceso rápido con cuenta de prueba */}
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => {
              setEmail('demo@redciudadana.org');
              setPassword('password123');
            }}
          >
            <Text style={styles.demoBtnText}>⚡ Autocompletar Cuenta Demo</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onGoRegister} style={styles.registerLink}>
            <Text style={styles.registerText}>¿No tienes cuenta? <Text style={{ color: '#38BDF8', fontWeight: 'bold' }}>Regístrate</Text></Text>
          </TouchableOpacity>

          <View style={styles.serverBadge}>
            <Text style={styles.serverText}>📡 Servidor: {authService.getApiUrl()}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0A0E17', justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 64 },
  appName: { color: '#38BDF8', fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  appSub: { color: '#94A3B8', fontSize: 14 },
  card: { backgroundColor: '#0F172A', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  label: { color: '#94A3B8', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#1E293B', color: 'white', borderRadius: 10,
    padding: 14, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  loginBtn: {
    backgroundColor: '#0284C7', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  loginBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  registerLink: { alignItems: 'center', marginTop: 16 },
  registerText: { color: '#94A3B8', fontSize: 14 },
  demoBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  demoBtnText: { color: '#38BDF8', fontWeight: '700', fontSize: 13 },
  serverBadge: {
    marginTop: 18,
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  serverText: { color: '#64748B', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
});
