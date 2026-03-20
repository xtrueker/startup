import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
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
        // No hubo respuesta del servidor (Error de red)
        msg = 'No se pudo conectar al servidor. Asegrate de que el backend est corriendo en tu PC y que la IP en config.ts (' + authService.getApiUrl() + ') sea la correcta de tu red Wi-Fi.';
      } else if (e.response?.data?.message) {
        msg = e.response.data.message;
      }
      
      Alert.alert('Error de registro', msg);
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
            <Text style={styles.loginText}>¿Ya tienes cuenta? <Text style={{ color: '#63b3ed', fontWeight: 'bold' }}>Ingresa</Text></Text>
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
  registerBtn: {
    backgroundColor: '#38a169', borderRadius: 8, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  registerBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginText: { color: '#a0aec0', fontSize: 14 },
});
