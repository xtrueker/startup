import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { authService } from '../services/auth';

interface RegisterScreenProps {
  onRegister: () => void;
  onGoLogin: () => void;
}

export default function RegisterScreen({ onRegister, onGoLogin }: RegisterScreenProps) {
  // Wizard Step: 1 = Datos, 2 = Cédula (Frente y Reverso), 3 = Biometría Facial (Selfie)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Paso 1: Datos Personales
  const [fullName, setFullName] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Paso 2: Cédula de Identidad (Fotos)
  const [idCardFront, setIdCardFront] = useState<string | null>(null);
  const [idCardBack, setIdCardBack] = useState<string | null>(null);

  // Paso 3: Prueba de Vida / Biometría Facial
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // --- CAPTURA DE FOTOS ---
  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Requerido',
          'Para verificar tu identidad y prevenir sabotajes en la red de seguridad, necesitamos acceso a la cámara.'
        );
        return false;
      }
    }
    return true;
  };

  const handleCapturePhoto = async (
    target: 'idFront' | 'idBack' | 'selfie',
    useFrontCamera = false
  ) => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const options: ImagePicker.ImagePickerOptions = {
        allowsEditing: true,
        aspect: target === 'selfie' ? [1, 1] : [16, 10],
        quality: 0.5,
        base64: true,
        cameraType: useFrontCamera ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      };

      const result = await ImagePicker.launchCameraAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

        if (target === 'idFront') setIdCardFront(dataUri);
        else if (target === 'idBack') setIdCardBack(dataUri);
        else if (target === 'selfie') setSelfiePhoto(dataUri);
      }
    } catch (err: any) {
      console.warn('Error al abrir la cámara:', err);
      // Fallback a galería si la cámara falla (ej. en simuladores o web)
      handlePickFromGallery(target);
    }
  };

  const handlePickFromGallery = async (target: 'idFront' | 'idBack' | 'selfie') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: target === 'selfie' ? [1, 1] : [16, 10],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

        if (target === 'idFront') setIdCardFront(dataUri);
        else if (target === 'idBack') setIdCardBack(dataUri);
        else if (target === 'selfie') setSelfiePhoto(dataUri);
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen: ' + err.message);
    }
  };

  // --- VALIDACIÓN DE PASOS ---
  const handleNextStep1 = () => {
    if (!fullName.trim() || !cedula.trim() || !email.trim() || !password) {
      Alert.alert('Datos Incompletos', 'Todos los campos marcados son obligatorios.');
      return;
    }
    if (cedula.trim().length < 6) {
      Alert.alert('Cédula Inválida', 'Por favor ingresa un número de cédula válido.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Email Inválido', 'Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña Débil', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!idCardFront || !idCardBack) {
      Alert.alert(
        'Verificación Obligatoria',
        'Debes capturar tanto la foto frontal como la posterior de tu cédula para evitar cuentas de sabotaje.'
      );
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    if (!selfiePhoto) {
      Alert.alert(
        'Validación Facial Obligatoria',
        'Debes tomar una foto de tu rostro para validar la prueba de vida bancaria.'
      );
      return;
    }

    setLoading(true);
    try {
      await authService.register({
        fullName: fullName.trim(),
        cedula: cedula.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        idCardFront: idCardFront || undefined,
        idCardBack: idCardBack || undefined,
        selfiePhoto: selfiePhoto || undefined,
      });

      Alert.alert(
        '🛡️ Identidad Verificada',
        'Tu registro y verificación biométrica han sido procesados exitosamente. Ahora formas parte de la Red Ciudadana Segura.',
        [{ text: 'Ingresar al Sistema', onPress: onRegister }]
      );
    } catch (e: any) {
      console.error('Error de registro KYC:', e);
      let msg = 'No se pudo completar el registro.';
      if (!e.response) {
        msg = 'No se pudo conectar al servidor backend. Verifica tu conexión de red.';
      } else if (e.response?.data?.message) {
        msg = e.response.data.message;
      }
      Alert.alert('Error en Validación', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0E17' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          
          {/* HEADER CON INDICADOR DE PASOS ESTILO BANCARIO */}
          <View style={styles.header}>
            <View style={styles.badgeKyc}>
              <Text style={styles.badgeKycText}>🔒 PROTOCOLO KYC FINTECH / SEGURIDAD NACIONAL</Text>
            </View>
            <Text style={styles.titleApp}>Red Ciudadana</Text>
            <Text style={styles.subtitleApp}>Validación de Identidad Anti-Sabotaje</Text>

            {/* Barra de progreso de 3 pasos */}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
                <Text style={styles.progressStepText}>1</Text>
              </View>
              <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
              <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
                <Text style={styles.progressStepText}>2</Text>
              </View>
              <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
              <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]}>
                <Text style={styles.progressStepText}>3</Text>
              </View>
            </View>

            <View style={styles.stepLabelsRow}>
              <Text style={[styles.stepLabelText, step === 1 && styles.stepLabelTextActive]}>Datos</Text>
              <Text style={[styles.stepLabelText, step === 2 && styles.stepLabelTextActive]}>Cédula</Text>
              <Text style={[styles.stepLabelText, step === 3 && styles.stepLabelTextActive]}>Biometría</Text>
            </View>
          </View>

          {/* ========================================================================= */}
          {/* PASO 1: DATOS PERSONALES                                                   */}
          {/* ========================================================================= */}
          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Paso 1: Datos Personales</Text>
              <Text style={styles.cardDesc}>
                Ingresa tus datos oficiales tal como aparecen en tu documento de identidad.
              </Text>

              <Text style={styles.label}>Nombre Completo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Andrés Felipe Guillén"
                placeholderTextColor="#64748B"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Número de Cédula (Sin puntos) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 1096123456"
                placeholderTextColor="#64748B"
                value={cedula}
                onChangeText={setCedula}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Teléfono Móvil (Para contacto de auxilio)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 3001234567"
                placeholderTextColor="#64748B"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Correo Electrónico *</Text>
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Contraseña Segura *</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep1}>
                <Text style={styles.primaryBtnText}>Continuar a Documento ➔</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onGoLogin} style={styles.loginLink}>
                <Text style={styles.loginText}>
                  ¿Ya tienes cuenta verificada? <Text style={styles.loginTextBold}>Ingresa</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================================================= */}
          {/* PASO 2: CÉDULA DE IDENTIDAD (FRENTE Y REVERSO)                              */}
          {/* ========================================================================= */}
          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Paso 2: Cédula de Identidad</Text>
              <Text style={styles.cardDesc}>
                Captura ambos lados de tu documento oficial. Asegúrate de encuadrarlo bien y que los textos sean legibles.
              </Text>

              {/* Foto Frontal */}
              <View style={styles.documentBox}>
                <View style={styles.documentHeader}>
                  <Text style={styles.documentTitle}>1. Foto Frontal (Con Foto y Nombres)</Text>
                  {idCardFront && <Text style={styles.checkBadge}>✅ Capturada</Text>}
                </View>

                {idCardFront ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: idCardFront }} style={styles.previewImage} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.retakeBtn}
                      onPress={() => handleCapturePhoto('idFront')}
                    >
                      <Text style={styles.retakeBtnText}>🔄 Repetir Foto</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Text style={styles.uploadIcon}>🪪</Text>
                    <Text style={styles.uploadText}>Coloca el frente de tu cédula en una superficie plana</Text>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.cameraBtn}
                        onPress={() => handleCapturePhoto('idFront')}
                      >
                        <Text style={styles.cameraBtnText}>📸 Tomar Foto</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.galleryBtn}
                        onPress={() => handlePickFromGallery('idFront')}
                      >
                        <Text style={styles.galleryBtnText}>Galería</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Foto Posterior */}
              <View style={styles.documentBox}>
                <View style={styles.documentHeader}>
                  <Text style={styles.documentTitle}>2. Foto Posterior (Reverso / Huella)</Text>
                  {idCardBack && <Text style={styles.checkBadge}>✅ Capturada</Text>}
                </View>

                {idCardBack ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: idCardBack }} style={styles.previewImage} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.retakeBtn}
                      onPress={() => handleCapturePhoto('idBack')}
                    >
                      <Text style={styles.retakeBtnText}>🔄 Repetir Foto</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Text style={styles.uploadIcon}>💳</Text>
                    <Text style={styles.uploadText}>Coloca el reverso con el código de barras y firma</Text>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.cameraBtn}
                        onPress={() => handleCapturePhoto('idBack')}
                      >
                        <Text style={styles.cameraBtnText}>📸 Tomar Foto</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.galleryBtn}
                        onPress={() => handlePickFromGallery('idBack')}
                      >
                        <Text style={styles.galleryBtnText}>Galería</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.navButtonsRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                  <Text style={styles.backBtnText}>⬅️ Volver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { flex: 1, marginLeft: 10, marginTop: 0 },
                    (!idCardFront || !idCardBack) && styles.btnDisabled,
                  ]}
                  onPress={handleNextStep2}
                  disabled={!idCardFront || !idCardBack}
                >
                  <Text style={styles.primaryBtnText}>Continuar a Biometría ➔</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* PASO 3: BIOMETRÍA FACIAL / PRUEBA DE VIDA (SELFIE)                         */}
          {/* ========================================================================= */}
          {step === 3 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Paso 3: Validación Facial</Text>
              <Text style={styles.cardDesc}>
                Prueba de vida para confirmar que la persona que crea la cuenta es el titular de la cédula.
              </Text>

              <View style={styles.securityTipsBox}>
                <Text style={styles.securityTipItem}>💡 Buena iluminación (sin sombras en el rostro)</Text>
                <Text style={styles.securityTipItem}>👓 Sin gafas oscuras, gorras ni mascarilla</Text>
                <Text style={styles.securityTipItem}>👤 Rostro centrado dentro del círculo</Text>
              </View>

              {/* Óvalo Biométrico */}
              <View style={styles.biometricArea}>
                {selfiePhoto ? (
                  <View style={styles.selfiePreviewContainer}>
                    <Image source={{ uri: selfiePhoto }} style={styles.selfieCircle} resizeMode="cover" />
                    <View style={styles.verifiedBadgeContainer}>
                      <Text style={styles.verifiedBadgeText}>✅ Rostro Capturado</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.retakeBtn, { marginTop: 16 }]}
                      onPress={() => handleCapturePhoto('selfie', true)}
                    >
                      <Text style={styles.retakeBtnText}>🔄 Repetir Selfie</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.biometricCirclePlaceholder}>
                    <Text style={styles.biometricSilhouette}>👤</Text>
                    <Text style={styles.biometricPrompt}>Encuadra tu rostro aquí</Text>
                    <TouchableOpacity
                      style={styles.selfieActionBtn}
                      onPress={() => handleCapturePhoto('selfie', true)}
                    >
                      <Text style={styles.selfieActionBtnText}>🤳 Tomar Selfie Facial</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ marginTop: 8 }}
                      onPress={() => handlePickFromGallery('selfie')}
                    >
                      <Text style={styles.gallerySubLink}>O subir desde galería</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.navButtonsRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                  <Text style={styles.backBtnText}>⬅️ Volver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    styles.finishBtn,
                    { flex: 1, marginLeft: 10, marginTop: 0 },
                    (!selfiePhoto || loading) && styles.btnDisabled,
                  ]}
                  onPress={handleFinalSubmit}
                  disabled={!selfiePhoto || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.primaryBtnText}>🛡️ Finalizar y Registrar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0A0E17',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeKyc: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#06B6D4',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeKycText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  titleApp: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
  },
  subtitleApp: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    width: '80%',
    justifyContent: 'center',
  },
  progressStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  progressStepText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#1E293B',
    marginHorizontal: 6,
  },
  progressLineActive: {
    backgroundColor: '#38BDF8',
  },
  stepLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '85%',
    marginTop: 6,
  },
  stepLabelText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  stepLabelTextActive: {
    color: '#38BDF8',
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1E293B',
    color: 'white',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  primaryBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 22,
  },
  primaryBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  finishBtn: {
    backgroundColor: '#059669',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  loginTextBold: {
    color: '#38BDF8',
    fontWeight: 'bold',
  },
  documentBox: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  documentTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: 'bold',
  },
  checkBadge: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: 'bold',
  },
  uploadPlaceholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#475569',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  uploadText: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cameraBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  cameraBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  galleryBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  galleryBtnText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  retakeBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  retakeBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  navButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  backBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
  },
  backBtnText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  securityTipsBox: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderColor: '#0284C7',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  securityTipItem: {
    color: '#BAE6FD',
    fontSize: 11,
    marginVertical: 2,
  },
  biometricArea: {
    alignItems: 'center',
    marginVertical: 16,
  },
  biometricCirclePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: 14,
  },
  biometricSilhouette: {
    fontSize: 54,
    marginBottom: 4,
  },
  biometricPrompt: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 10,
  },
  selfieActionBtn: {
    backgroundColor: '#059669',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  selfieActionBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gallerySubLink: {
    color: '#64748B',
    fontSize: 10,
    textDecorationLine: 'underline',
  },
  selfiePreviewContainer: {
    alignItems: 'center',
  },
  selfieCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  verifiedBadgeContainer: {
    position: 'absolute',
    bottom: 34,
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    color: '#6EE7B7',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
