import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
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

          <TouchableOpacity onPress={onGoRegister} style={styles.registerLink}>
            <Text style={styles.registerText}>¿No tienes cuenta? <Text style={{ color: '#63b3ed', fontWeight: 'bold' }}>Regístrate</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#1a202c', justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 64 },
  appName: { color: '#63b3ed', fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  appSub: { color: '#718096', fontSize: 14 },
  card: { backgroundColor: '#2d3748', borderRadius: 16, padding: 24 },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  label: { color: '#a0aec0', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#4a5568', color: 'white', borderRadius: 8,
    padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#718096',
  },
  loginBtn: {
    backgroundColor: '#3182ce', borderRadius: 8, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  loginBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  registerLink: { alignItems: 'center', marginTop: 16 },
  registerText: { color: '#a0aec0', fontSize: 14 },
});
