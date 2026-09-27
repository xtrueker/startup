import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../services/auth';

interface RegisterScreenProps {
  onRegister: () => void;
  onGoLogin: () => void;
}

export default function RegisterScreen({ onRegister, onGoLogin }: RegisterScreenProps) {
  const [fullName, setFullName] = useState('');
  const [cedula, setCedula] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !cedula || !email || !password) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }
    
    setLoading(true);
    try {
      await authService.register({
        fullName: fullName.trim(),
        cedula: cedula.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      Alert.alert('Éxito', 'Usuario registrado correctamente');
      onRegister();
    } catch (e: any) {
      console.error('Error de registro:', e);
      let msg = 'No se pudo completar el registro';
      
      if (!e.response) {
        msg = 'No se pudo conectar al servidor. Asegúrate de que el backend esté corriendo en tu PC y que la IP en config.ts sea accesible.';
      } else if (e.response?.data?.message) {
        msg = e.response.data.message;
      }
      
      Alert.alert('Error de registro', msg);
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
          <Text style={styles.appSub}>Crear Cuenta</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Registro</Text>

          <Text style={styles.label}>Nombre Completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Juan Pérez"
            placeholderTextColor="#718096"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Cédula (Identificación)</Text>
          <TextInput
            style={styles.input}
            placeholder="12345678"
            placeholderTextColor="#718096"
            value={cedula}
            onChangeText={setCedula}
            keyboardType="number-pad"
          />

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

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.registerBtnText}>Registrarse</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onGoLogin} style={styles.loginLink}>
            <Text style={styles.loginText}>¿Ya tienes cuenta? <Text style={{ color: '#38BDF8', fontWeight: 'bold' }}>Ingresa</Text></Text>
          </TouchableOpacity>
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
  registerBtn: {
    backgroundColor: '#059669', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  registerBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginText: { color: '#94A3B8', fontSize: 14 },
});
