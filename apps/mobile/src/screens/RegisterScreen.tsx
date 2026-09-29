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
  // Wizard Step: 1 = Datos, 2 = Cédula, 3 = Biometría Facial, 4 = Confirmación y Envío
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

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

  // Paso 4: Confirmación y Declaración Jurada
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Liveness Challenge (Anti-suplantación)
  const LIVENESS_CHALLENGES = [
    { instruction: '😊 Sonríe naturalmente mirando a la cámara', icon: '😊' },
    { instruction: '👉 Gira tu cabeza ligeramente a la derecha', icon: '👉' },
    { instruction: '👈 Gira tu cabeza ligeramente a la izquierda', icon: '👈' },
    { instruction: '😮 Abre la boca ligeramente', icon: '😮' },
    { instruction: '😌 Cierra los ojos por un segundo y ábrelos', icon: '😌' },
  ];
  const [livenessChallenge, setLivenessChallenge] = useState<typeof LIVENESS_CHALLENGES[0] | null>(null);
  const [livenessAccepted, setLivenessAccepted] = useState(false);

  const startLivenessChallenge = () => {
    const random = LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)];
    setLivenessChallenge(random);
    setLivenessAccepted(false);
  };

  const confirmLivenessAndCapture = async () => {
    setLivenessAccepted(true);
    await handleCapturePhoto('selfie', true);
  };

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
      Alert.alert(
        'Cámara No Disponible',
        'No se pudo acceder a la cámara. Verifica los permisos en la configuración de tu dispositivo.'
      );
    }
  };

  // --- VALIDACIÓN DE PASOS ---
  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!/[A-Z]/.test(pass)) return 'Debe contener al menos una letra mayúscula.';
    if (!/[a-z]/.test(pass)) return 'Debe contener al menos una letra minúscula.';
    if (!/[0-9]/.test(pass)) return 'Debe contener al menos un número.';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) return 'Debe contener al menos un carácter especial (!@#$%...).';
    return null;
  };

  const getPasswordStrength = (pass: string): { level: number; label: string; color: string } => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) score++;
    if (score <= 1) return { level: score, label: 'Muy Débil', color: '#EF4444' };
    if (score <= 2) return { level: score, label: 'Débil', color: '#F97316' };
    if (score <= 3) return { level: score, label: 'Aceptable', color: '#EAB308' };
    if (score <= 4) return { level: score, label: 'Fuerte', color: '#22C55E' };
    return { level: score, label: 'Muy Fuerte', color: '#10B981' };
  };

  const handleNextStep1 = () => {
    if (!fullName.trim() || !cedula.trim() || !email.trim() || !password) {
      Alert.alert('Datos Incompletos', 'Todos los campos marcados son obligatorios.');
      return;
    }
    // Validación de cédula colombiana: solo números, entre 6 y 10 dígitos
    if (!/^\d{6,10}$/.test(cedula.trim())) {
      Alert.alert('Cédula Inválida', 'La cédula debe contener entre 6 y 10 dígitos numéricos, sin puntos ni letras.');
      return;
    }
    // Validación robusta de email
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Email Inválido', 'Por favor ingresa un correo electrónico válido (ej: nombre@dominio.com).');
      return;
    }
    // Validación de contraseña robusta
    const passError = validatePassword(password);
    if (passError) {
      Alert.alert('Contraseña No Cumple Requisitos', passError);
      return;
    }
    // Validación de teléfono si fue ingresado
    if (phone.trim() && !/^\d{7,10}$/.test(phone.trim().replace(/[\s\-\+]/g, ''))) {
      Alert.alert('Teléfono Inválido', 'El número de teléfono debe contener entre 7 y 10 dígitos.');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!idCardFront || !idCardBack) {
      Alert.alert(
        'Verificación Obligatoria',
        'Debes capturar tanto la foto frontal como la posterior de tu cédula. Solo se permite cámara en vivo para evitar fraude.'
      );
      return;
    }
    setStep(3);
  };

  const handleNextStep3 = () => {
    if (!selfiePhoto) {
      Alert.alert(
        'Validación Facial Obligatoria',
        'Debes tomar una foto de tu rostro con la cámara frontal en vivo.'
      );
      return;
    }
    setStep(4);
  };

  const handleFinalSubmit = async () => {
    if (!acceptedTerms) {
      Alert.alert(
        'Declaración Jurada Requerida',
        'Debes aceptar la declaración jurada confirmando que los datos y documentos proporcionados son auténticos y te pertenecen.'
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
        '📋 Solicitud Enviada',
        'Tu solicitud de registro fue recibida exitosamente.\n\nNuestro equipo de seguridad validará tu identidad comparando tu selfie con la foto de tu cédula. Recibirás confirmación cuando tu cuenta sea aprobada.\n\nEste proceso puede tomar hasta 24-48 horas.',
        [{ text: 'Entendido', onPress: onRegister }]
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

            {/* Barra de progreso de 4 pasos */}
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
              <View style={[styles.progressLine, step >= 4 && styles.progressLineActive]} />
              <View style={[styles.progressStep, step >= 4 && styles.progressStepActive]}>
                <Text style={styles.progressStepText}>4</Text>
              </View>
            </View>

            <View style={styles.stepLabelsRow}>
              <Text style={[styles.stepLabelText, step === 1 && styles.stepLabelTextActive]}>Datos</Text>
              <Text style={[styles.stepLabelText, step === 2 && styles.stepLabelTextActive]}>Cédula</Text>
              <Text style={[styles.stepLabelText, step === 3 && styles.stepLabelTextActive]}>Biometría</Text>
              <Text style={[styles.stepLabelText, step === 4 && styles.stepLabelTextActive]}>Confirmar</Text>
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

              <Text style={styles.label}>Contraseña Segura * (Mín. 8 chars, mayúscula, número, especial)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: MiClave#2026"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {password.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1, height: 4, backgroundColor: '#1E293B', borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ width: `${(getPasswordStrength(password).level / 5) * 100}%`, height: '100%', backgroundColor: getPasswordStrength(password).color, borderRadius: 2 }} />
                    </View>
                    <Text style={{ color: getPasswordStrength(password).color, fontSize: 10, fontWeight: 'bold' }}>{getPasswordStrength(password).label}</Text>
                  </View>
                </View>
              )}

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

              <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: '#EF4444', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14 }}>
                <Text style={{ color: '#FCA5A5', fontSize: 10, fontWeight: 'bold' }}>🔒 MEDIDA ANTI-FRAUDE: Solo se permiten fotos en vivo con la cámara. No se aceptan imágenes de galería para evitar suplantación de identidad.</Text>
              </View>

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
                        <Text style={styles.cameraBtnText}>📸 Tomar Foto con Cámara</Text>
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
                        <Text style={styles.cameraBtnText}>📸 Tomar Foto con Cámara</Text>
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

              {/* Óvalo Biométrico con Liveness Challenge */}
              <View style={styles.biometricArea}>
                {selfiePhoto ? (
                  <View style={styles.selfiePreviewContainer}>
                    <Image source={{ uri: selfiePhoto }} style={styles.selfieCircle} resizeMode="cover" />
                    <View style={styles.verifiedBadgeContainer}>
                      <Text style={styles.verifiedBadgeText}>✅ Rostro Capturado</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.retakeBtn, { marginTop: 16 }]}
                      onPress={() => { setSelfiePhoto(null); setLivenessChallenge(null); setLivenessAccepted(false); }}
                    >
                      <Text style={styles.retakeBtnText}>🔄 Repetir Selfie</Text>
                    </TouchableOpacity>
                  </View>
                ) : livenessChallenge ? (
                  <View style={styles.biometricCirclePlaceholder}>
                    <Text style={{ fontSize: 48, marginBottom: 8 }}>{livenessChallenge.icon}</Text>
                    <Text style={{ color: '#FDE68A', fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>PRUEBA DE VIDA</Text>
                    <Text style={{ color: '#E2E8F0', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 12, paddingHorizontal: 8 }}>
                      {livenessChallenge.instruction}
                    </Text>
                    <TouchableOpacity
                      style={styles.selfieActionBtn}
                      onPress={confirmLivenessAndCapture}
                    >
                      <Text style={styles.selfieActionBtnText}>📸 Listo, Tomar Foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ marginTop: 8 }}
                      onPress={startLivenessChallenge}
                    >
                      <Text style={{ color: '#64748B', fontSize: 10 }}>🔄 Otro desafío</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.biometricCirclePlaceholder}>
                    <Text style={styles.biometricSilhouette}>👤</Text>
                    <Text style={styles.biometricPrompt}>Encuadra tu rostro aquí</Text>
                    <TouchableOpacity
                      style={styles.selfieActionBtn}
                      onPress={startLivenessChallenge}
                    >
                      <Text style={styles.selfieActionBtnText}>🤳 Iniciar Prueba de Vida</Text>
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
                    { flex: 1, marginLeft: 10, marginTop: 0 },
                    !selfiePhoto && styles.btnDisabled,
                  ]}
                  onPress={handleNextStep3}
                  disabled={!selfiePhoto}
                >
                  <Text style={styles.primaryBtnText}>Revisar y Confirmar ➔</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* PASO 4: CONFIRMACIÓN, DECLARACIÓN JURADA Y ENVÍO                          */}
          {/* ========================================================================= */}
          {step === 4 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Paso 4: Confirmar y Enviar</Text>
              <Text style={styles.cardDesc}>
                Revisa que toda la información sea correcta antes de enviar tu solicitud de registro.
              </Text>

              {/* Resumen de Datos */}
              <View style={styles.securityTipsBox}>
                <Text style={{ color: '#BAE6FD', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>📋 Resumen de tu Solicitud:</Text>
                <Text style={{ color: '#E2E8F0', fontSize: 12, marginVertical: 2 }}>👤 Nombre: {fullName}</Text>
                <Text style={{ color: '#E2E8F0', fontSize: 12, marginVertical: 2 }}>🪪 Cédula: {cedula}</Text>
                <Text style={{ color: '#E2E8F0', fontSize: 12, marginVertical: 2 }}>📧 Email: {email.toLowerCase()}</Text>
                {phone.trim() ? <Text style={{ color: '#E2E8F0', fontSize: 12, marginVertical: 2 }}>📱 Teléfono: {phone}</Text> : null}
                <Text style={{ color: '#4ADE80', fontSize: 12, marginVertical: 2 }}>✅ Cédula Frontal: Capturada</Text>
                <Text style={{ color: '#4ADE80', fontSize: 12, marginVertical: 2 }}>✅ Cédula Reverso: Capturada</Text>
                <Text style={{ color: '#4ADE80', fontSize: 12, marginVertical: 2 }}>✅ Selfie Biométrica: Capturada</Text>
              </View>

              {/* Miniaturas */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
                {idCardFront && <Image source={{ uri: idCardFront }} style={{ flex: 1, height: 70, borderRadius: 8, borderWidth: 1, borderColor: '#38BDF8' }} resizeMode="cover" />}
                {idCardBack && <Image source={{ uri: idCardBack }} style={{ flex: 1, height: 70, borderRadius: 8, borderWidth: 1, borderColor: '#38BDF8' }} resizeMode="cover" />}
                {selfiePhoto && <Image source={{ uri: selfiePhoto }} style={{ width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#10B981' }} resizeMode="cover" />}
              </View>

              {/* Declaración Jurada */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  backgroundColor: acceptedTerms ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                  borderColor: acceptedTerms ? '#10B981' : '#475569',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 16,
                  gap: 10,
                }}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 24, height: 24, borderRadius: 6,
                  borderWidth: 2, borderColor: acceptedTerms ? '#10B981' : '#64748B',
                  backgroundColor: acceptedTerms ? '#10B981' : 'transparent',
                  justifyContent: 'center', alignItems: 'center', marginTop: 2,
                }}>
                  {acceptedTerms && <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>✓</Text>}
                </View>
                <Text style={{ flex: 1, color: '#CBD5E1', fontSize: 11, lineHeight: 17 }}>
                  <Text style={{ fontWeight: 'bold', color: '#F59E0B' }}>DECLARACIÓN JURADA: </Text>
                  Declaro bajo gravedad de juramento que los datos personales, documentos de identidad y fotografía biométrica proporcionados son auténticos, verídicos y me pertenecen. Entiendo que proporcionar información falsa constituye un delito y puede derivar en acciones legales conforme a la ley colombiana.
                </Text>
              </TouchableOpacity>

              {/* Aviso de Revisión */}
              <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#F59E0B', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <Text style={{ color: '#FDE68A', fontSize: 11, lineHeight: 16 }}>
                  ⏳ Tu solicitud será revisada por nuestro equipo de seguridad. La aprobación puede tomar entre 24 y 48 horas. Te notificaremos cuando tu cuenta esté activa.
                </Text>
              </View>

              <View style={styles.navButtonsRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(3)}>
                  <Text style={styles.backBtnText}>⬅️ Volver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    styles.finishBtn,
                    { flex: 1, marginLeft: 10, marginTop: 0 },
                    (!acceptedTerms || loading) && styles.btnDisabled,
                  ]}
                  onPress={handleFinalSubmit}
                  disabled={!acceptedTerms || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.primaryBtnText}>📋 Enviar Solicitud de Registro</Text>
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
