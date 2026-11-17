import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { authService } from '../services/auth';
import { palette, fontSans, glassSurfaceStyle, sculptedShadow } from '../theme/prismTheme';
import {
  AmbientPrismCanvas,
  LiquidGlassCard,
  LiquidInput,
  LiquidPillButton,
  PrismEmblem,
  PrismIcon,
  StatusPill,
  TelemetryEqualizer,
} from '../components/ui/PrismPrimitives';

interface RegisterScreenProps {
  onRegister: () => void;
  onGoLogin: () => void;
}

const STEP_META: { id: 1 | 2 | 3; label: string }[] = [
  { id: 1, label: '1. Cédula IA' },
  { id: 2, label: '2. Biometría' },
  { id: 3, label: '3. Activar' },
];

const LIVENESS_CHALLENGES = [
  { instruction: 'Mira al frente con naturalidad y buena iluminación.' },
  { instruction: 'Gira muy levemente tu rostro hacia la derecha.' },
  { instruction: 'Gira muy levemente tu rostro hacia la izquierda.' },
  { instruction: 'Sonríe con naturalidad mirando a la cámara.' },
];

export default function RegisterScreen({ onRegister, onGoLogin }: RegisterScreenProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Datos extraídos automáticamente por IA + completados en Paso 3
  const [fullName, setFullName] = useState('');
  const [cedula, setCedula] = useState('');
  const [aiExtractedName, setAiExtractedName] = useState(false);
  const [aiExtractedCedula, setAiExtractedCedula] = useState(false);
  const [detectedDocType, setDetectedDocType] = useState<string>('Cédula de Ciudadanía');
  const [docFaceConfidence, setDocFaceConfidence] = useState<number | null>(null);

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Paso 1: Captura y análisis IA de Cédula
  const [idCardFront, setIdCardFront] = useState<string | null>(null);
  const [idCardBack, setIdCardBack] = useState<string | null>(null);
  const [analyzingSide, setAnalyzingSide] = useState<'front' | 'back' | null>(null);

  // Paso 2: Cruce Biométrico Facial en Vivo
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [verifyingBiometrics, setVerifyingBiometrics] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [biometricScore, setBiometricScore] = useState<number | null>(null);
  const [livenessChallenge, setLivenessChallenge] = useState(
    () => LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)]
  );

  // Paso 3: Confirmación final
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const reportError = (title: string, message: string) => {
    setStepError(message);
    if (Platform.OS !== 'web') {
      Alert.alert(title, message);
    }
  };

  const rotateChallenge = () => {
    const next = LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)];
    setLivenessChallenge(next);
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        reportError(
          'Permiso de cámara',
          'Necesitamos acceso a tu cámara para escanear tu documento y validar tu rostro.'
        );
        return false;
      }
    }
    return true;
  };

  const normalizeWebImage = async (uri: string): Promise<string> => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return uri;
    return new Promise<string>((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 1600;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(uri);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => resolve(uri);
      img.src = uri;
    });
  };

  const handleCapturePhoto = async (
    target: 'idFront' | 'idBack' | 'selfie',
    useFrontCamera = false
  ) => {
    setStepError(null);
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
        cameraType: useFrontCamera
          ? ImagePicker.CameraType.front
          : ImagePicker.CameraType.back,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      let dataUri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;

      if (Platform.OS === 'web' && asset.uri) {
        dataUri = await normalizeWebImage(asset.uri);
      }

      // 1. FRENTE DE CÉDULA: OCR + Detección de Retrato con IA en vivo
      if (target === 'idFront') {
        setAnalyzingSide('front');
        setSelfiePhoto(null);
        setBiometricVerified(false);
        setBiometricScore(null);

        try {
          const analysis = await authService.analyzeDocument({
            imageBase64: dataUri,
            side: 'front',
          });

          setIdCardFront(dataUri);
          setDetectedDocType(analysis.documentType || 'Cédula de Ciudadanía');
          setDocFaceConfidence(analysis.faceConfidence);

          if (analysis.detectedFullName) {
            setFullName(analysis.detectedFullName);
            setAiExtractedName(true);
          }
          if (analysis.detectedCedula) {
            setCedula(analysis.detectedCedula);
            setAiExtractedCedula(true);
          }

          if (Platform.OS !== 'web') Vibration.vibrate(45);

          // Si ya tenía reverso capturado, avanzar automáticamente al cruce facial
          if (idCardBack) {
            autoAdvanceTimer.current = setTimeout(() => setStep(2), 500);
          }
        } catch (err: any) {
          setIdCardFront(null);
          const msg =
            err?.response?.data?.message ||
            'No logramos leer el frente de tu cédula. Asegúrate de enfocar el lado con tu fotografía y buena luz.';
          reportError('Lectura de documento', msg);
        } finally {
          setAnalyzingSide(null);
        }
        return;
      }

      // 2. REVERSO DE CÉDULA: Verificación óptica + Auto-avance al Paso 2
      if (target === 'idBack') {
        setAnalyzingSide('back');
        try {
          const backAnalysis = await authService.analyzeDocument({
            imageBase64: dataUri,
            side: 'back',
          });

          setIdCardBack(dataUri);

          // Respaldo: si el frente tenía brillo parcial y el reverso trae MRZ/datos legibles, completarlos
          if (!fullName && backAnalysis.detectedFullName) {
            setFullName(backAnalysis.detectedFullName);
            setAiExtractedName(true);
          }
          if (!cedula && backAnalysis.detectedCedula) {
            setCedula(backAnalysis.detectedCedula);
            setAiExtractedCedula(true);
          }

          if (Platform.OS !== 'web') Vibration.vibrate(45);

          if (idCardFront) {
            autoAdvanceTimer.current = setTimeout(() => setStep(2), 550);
          }
        } catch (err: any) {
          setIdCardBack(null);
          const msg =
            err?.response?.data?.message ||
            'No logramos validar el reverso del documento. Acerca un poco más la cámara sin reflejos.';
          reportError('Reverso no legible', msg);
        } finally {
          setAnalyzingSide(null);
        }
        return;
      }

      // 3. SELFIE EN VIVO: Comparación Biométrica contra Retrato de Cédula + Auto-avance al Paso 3
      if (target === 'selfie') {
        if (!idCardFront) {
          setStep(1);
          return;
        }

        setVerifyingBiometrics(true);
        setBiometricVerified(false);
        setBiometricScore(null);

        try {
          const verification = await authService.verifyBiometrics({
            idCardFront,
            selfiePhoto: dataUri,
          });

          if (!verification?.verified) {
            setSelfiePhoto(null);
            reportError(
              'Identidad no coincide',
              'El rostro capturado no corresponde al titular del documento.'
            );
            return;
          }

          setSelfiePhoto(dataUri);
          setBiometricVerified(true);
          setBiometricScore(verification.similarityScore);

          if (Platform.OS !== 'web') Vibration.vibrate([0, 50, 60, 50]);

          // Avance automático fluido al Paso 3 tras confirmar identidad
          autoAdvanceTimer.current = setTimeout(() => setStep(3), 700);
        } catch (bioErr: any) {
          setSelfiePhoto(null);
          setBiometricVerified(false);
          setBiometricScore(null);
          const serverMsg =
            bioErr?.response?.data?.message ||
            'El rostro capturado no coincide con el documento de identidad.';
          reportError('Verificación facial rechazada', serverMsg);
        } finally {
          setVerifyingBiometrics(false);
        }
      }
    } catch {
      reportError(
        'Cámara no disponible',
        'No se pudo abrir la cámara. Verifica los permisos del dispositivo.'
      );
    }
  };

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'Usa al menos 8 caracteres.';
    if (!/[A-Z]/.test(pass)) return 'Incluye al menos una letra mayúscula.';
    if (!/[a-z]/.test(pass)) return 'Incluye al menos una letra minúscula.';
    if (!/[0-9]/.test(pass)) return 'Incluye al menos un número.';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) {
      return 'Incluye al menos un símbolo especial (!@#$%...).';
    }
    return null;
  };

  const getPasswordStrength = (
    pass: string
  ): { level: number; label: string; color: string } => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) score++;
    if (score <= 1) return { level: score, label: 'Muy débil', color: palette.crimson };
    if (score <= 2) return { level: score, label: 'Débil', color: '#EA580C' };
    if (score <= 3) return { level: score, label: 'Aceptable', color: palette.amber };
    if (score <= 4) return { level: score, label: 'Segura', color: palette.aqua };
    return { level: score, label: 'Excelente', color: palette.emeraldBright };
  };

  const handleFinalSubmit = async () => {
    setStepError(null);
    if (!idCardFront || !idCardBack || !selfiePhoto || !biometricVerified) {
      reportError('Verificación incompleta', 'Completa primero el escaneo documental y facial.');
      return;
    }
    if (!fullName.trim() || !cedula.trim() || !email.trim() || !password) {
      reportError('Datos pendientes', 'Completa tu correo electrónico y contraseña.');
      return;
    }
    if (!/^\d{6,10}$/.test(cedula.trim())) {
      reportError('Cédula inválida', 'Verifica los dígitos de tu número de documento.');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      reportError('Correo inválido', 'Ingresa un correo electrónico válido.');
      return;
    }
    const passError = validatePassword(password);
    if (passError) {
      reportError('Contraseña insegura', passError);
      return;
    }
    if (!acceptedTerms) {
      reportError(
        'Consentimiento requerido',
        'Acepta la autorización de tratamiento biométrico (Ley 1581) para activar tu cuenta.'
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
        idCardFront,
        idCardBack,
        selfiePhoto,
      });

      if (Platform.OS !== 'web') Vibration.vibrate(60);
      onRegister();
    } catch (e: any) {
      let msg = 'No se pudo completar el registro.';
      if (!e.response) {
        msg = 'No fue posible conectar con el servidor. Revisa tu conexión.';
      } else if (e.response?.data?.message) {
        msg = e.response.data.message;
      }
      reportError('No se pudo activar la cuenta', msg);
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientPrismCanvas intensity="normal" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.shell}>
            {/* Top Frosted Pill Bar */}
            <View style={[styles.topBar, glassSurfaceStyle(24, true)]}>
              <TouchableOpacity
                onPress={onGoLogin}
                activeOpacity={0.75}
                style={styles.backChip}
              >
                <PrismIcon name="arrowLeft" size={14} color={palette.textPrimary} />
                <Text style={styles.backChipText}>Iniciar sesión</Text>
              </TouchableOpacity>

              <View style={styles.brandMini}>
                <PrismEmblem size={28} />
                <Text style={styles.brandMiniText}>Verificación IA</Text>
              </View>
            </View>

            {/* 3-Step Stepper */}
            <View style={[styles.stepperBar, glassSurfaceStyle(22, false)]}>
              {STEP_META.map((item) => {
                const isCurrent = step === item.id;
                const isDone = step > item.id;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.stepPill,
                      isCurrent && styles.stepPillCurrent,
                      isDone && styles.stepPillDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepPillText,
                        isCurrent && styles.stepPillTextCurrent,
                        isDone && styles.stepPillTextDone,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {stepError ? (
              <View style={styles.errorBanner}>
                <PrismIcon name="alert" size={16} color={palette.crimson} />
                <Text style={styles.errorBannerText}>{stepError}</Text>
              </View>
            ) : null}

            {/* ============================================================== */}
            {/* PASO 1: LECTURA AUTOMÁTICA DE CÉDULA CON IA                     */}
            {/* ============================================================== */}
            {step === 1 && (
              <LiquidGlassCard strong blurPx={34}>
                <Text style={styles.cardTitle}>Escaneo inteligente</Text>
                <Text style={styles.cardSubtitle}>
                  Enfoca tu cédula; el sistema extraerá tus datos automáticamente sin escribirlos a mano.
                </Text>

                {/* Frente de la cédula */}
                <View style={styles.docBox}>
                  <View style={styles.docHeader}>
                    <Text style={styles.docTitle}>1. Frente del documento</Text>
                    <StatusPill
                      label={
                        analyzingSide === 'front'
                          ? 'Leyendo IA...'
                          : idCardFront
                          ? 'Extraído'
                          : 'Requerido'
                      }
                      tone={
                        analyzingSide === 'front'
                          ? 'aqua'
                          : idCardFront
                          ? 'emerald'
                          : 'neutral'
                      }
                    />
                  </View>

                  {analyzingSide === 'front' ? (
                    <View style={styles.aiScanBox}>
                      <TelemetryEqualizer color={palette.aqua} active />
                      <Text style={styles.aiScanTitle}>
                        Extrayendo nombres, número y retrato facial...
                      </Text>
                    </View>
                  ) : idCardFront ? (
                    <View style={styles.previewWrap}>
                      <Image
                        source={{ uri: idCardFront }}
                        style={styles.previewImg}
                        resizeMode="cover"
                      />

                      {/* Tarjeta de telemetría extraída automáticamente por IA */}
                      <View style={styles.extractedTelemetryCard}>
                        <View style={styles.extractedHeaderRow}>
                          <PrismIcon name="scan" size={14} color={palette.aqua} />
                          <Text style={styles.extractedTypeText}>{detectedDocType}</Text>
                          {docFaceConfidence ? (
                            <Text style={styles.extractedConfText}>
                              Retrato {docFaceConfidence}%
                            </Text>
                          ) : null}
                        </View>
                        {fullName ? (
                          <Text style={styles.extractedPrimaryText}>{fullName}</Text>
                        ) : null}
                        {cedula ? (
                          <Text style={styles.extractedSubText}>No. {cedula}</Text>
                        ) : null}
                      </View>

                      <LiquidPillButton
                        label="Reescanear frente"
                        variant="glass"
                        size="sm"
                        icon="refresh"
                        iconPosition="left"
                        onPress={() => handleCapturePhoto('idFront')}
                      />
                    </View>
                  ) : (
                    <View style={styles.captureWell}>
                      <PrismIcon name="idCard" size={28} color={palette.aqua} />
                      <Text style={styles.captureHint}>
                        Ubica el frente donde aparece tu fotografía con buena luz
                      </Text>
                      <LiquidPillButton
                        label="Escanear frente"
                        variant="obsidian"
                        size="sm"
                        icon="camera"
                        iconPosition="left"
                        onPress={() => handleCapturePhoto('idFront')}
                      />
                    </View>
                  )}
                </View>

                {/* Reverso de la cédula */}
                <View style={styles.docBox}>
                  <View style={styles.docHeader}>
                    <Text style={styles.docTitle}>2. Reverso del documento</Text>
                    <StatusPill
                      label={
                        analyzingSide === 'back'
                          ? 'Validando...'
                          : idCardBack
                          ? 'Validado'
                          : 'Pendiente'
                      }
                      tone={
                        analyzingSide === 'back'
                          ? 'aqua'
                          : idCardBack
                          ? 'emerald'
                          : 'neutral'
                      }
                    />
                  </View>

                  {analyzingSide === 'back' ? (
                    <View style={styles.aiScanBox}>
                      <TelemetryEqualizer color={palette.aqua} active />
                      <Text style={styles.aiScanTitle}>
                        Verificando respaldo y código documental...
                      </Text>
                    </View>
                  ) : idCardBack ? (
                    <View style={styles.previewWrap}>
                      <Image
                        source={{ uri: idCardBack }}
                        style={styles.previewImg}
                        resizeMode="cover"
                      />
                      <LiquidPillButton
                        label="Reescanear reverso"
                        variant="glass"
                        size="sm"
                        icon="refresh"
                        iconPosition="left"
                        onPress={() => handleCapturePhoto('idBack')}
                      />
                    </View>
                  ) : (
                    <View style={styles.captureWell}>
                      <PrismIcon name="scan" size={26} color={palette.aqua} />
                      <Text style={styles.captureHint}>
                        Al validar el reverso pasarás automáticamente a biometría
                      </Text>
                      <LiquidPillButton
                        label="Escanear reverso"
                        variant="obsidian"
                        size="sm"
                        icon="camera"
                        iconPosition="left"
                        disabled={!idCardFront || analyzingSide !== null}
                        onPress={() => handleCapturePhoto('idBack')}
                      />
                    </View>
                  )}
                </View>

                {idCardFront && idCardBack && analyzingSide === null ? (
                  <LiquidPillButton
                    label="Continuar a biometría"
                    variant="obsidian"
                    size="lg"
                    icon="arrowRight"
                    onPress={() => setStep(2)}
                  />
                ) : null}
              </LiquidGlassCard>
            )}

            {/* ============================================================== */}
            {/* PASO 2: CRUCE BIOMÉTRICO FACIAL EN UN TOQUE                     */}
            {/* ============================================================== */}
            {step === 2 && (
              <LiquidGlassCard strong blurPx={34}>
                <Text style={styles.cardTitle}>Reconocimiento facial</Text>
                <Text style={styles.cardSubtitle}>
                  {fullName
                    ? `Confirmando en vivo la identidad de ${fullName.split(' ')[0]}.`
                    : 'Comparamos tus rasgos faciales en vivo contra el retrato de tu cédula.'}
                </Text>

                <View style={styles.selfieCenterStage}>
                  {verifyingBiometrics ? (
                    <View style={[styles.sculptedSelfieOrb, sculptedShadow()]}>
                      <ActivityIndicator size="large" color={palette.aqua} />
                      <Text style={styles.orbTitle}>Analizando geometría facial</Text>
                      <Text style={styles.orbHint}>
                        Cruzando vectores biométricos con tu documento...
                      </Text>
                    </View>
                  ) : selfiePhoto && biometricVerified ? (
                    <View style={styles.selfieCapturedWrap}>
                      <View style={[styles.selfieBezel, sculptedShadow()]}>
                        <Image
                          source={{ uri: selfiePhoto }}
                          style={styles.selfieImg}
                          resizeMode="cover"
                        />
                      </View>
                      <View style={{ marginTop: 12 }}>
                        <StatusPill
                          label={
                            biometricScore !== null
                              ? `Titular confirmado · ${Math.round(biometricScore)}%`
                              : 'Titular confirmado'
                          }
                          tone="emerald"
                        />
                      </View>
                      <LiquidPillButton
                        label="Repetir captura"
                        variant="glass"
                        size="sm"
                        icon="refresh"
                        iconPosition="left"
                        onPress={() => {
                          setSelfiePhoto(null);
                          setBiometricVerified(false);
                          setBiometricScore(null);
                          rotateChallenge();
                        }}
                        style={{ marginTop: 10 }}
                      />
                    </View>
                  ) : (
                    <View style={[styles.sculptedSelfieOrb, sculptedShadow()]}>
                      <PrismIcon name="scan" size={32} color={palette.aqua} />
                      <Text style={styles.challengeCopy}>
                        {livenessChallenge.instruction}
                      </Text>
                      <LiquidPillButton
                        label="Iniciar escaneo facial"
                        variant="obsidian"
                        size="sm"
                        icon="camera"
                        iconPosition="left"
                        onPress={() => handleCapturePhoto('selfie', true)}
                      />
                      <TouchableOpacity onPress={rotateChallenge} style={{ marginTop: 8 }}>
                        <Text style={styles.otherGestureLink}>Cambiar indicación</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.navRow}>
                  <LiquidPillButton
                    label="Documento"
                    variant="glass"
                    icon="arrowLeft"
                    iconPosition="left"
                    onPress={() => {
                      setStepError(null);
                      setStep(1);
                    }}
                  />
                  <LiquidPillButton
                    label="Siguiente"
                    variant="obsidian"
                    icon="arrowRight"
                    disabled={!selfiePhoto || !biometricVerified || verifyingBiometrics}
                    onPress={() => setStep(3)}
                    style={styles.flex}
                  />
                </View>
              </LiquidGlassCard>
            )}

            {/* ============================================================== */}
            {/* PASO 3: DATOS AUTOCOMPLETADOS + CREDENCIAL DE ACCESO           */}
            {/* ============================================================== */}
            {step === 3 && (
              <LiquidGlassCard strong blurPx={34}>
                <View style={styles.step3BadgeRow}>
                  <StatusPill
                    label={
                      biometricScore !== null
                        ? `Biometría ${Math.round(biometricScore)}% aprobada`
                        : 'Biometría aprobada'
                    }
                    tone="emerald"
                  />
                  {(aiExtractedName || aiExtractedCedula) && (
                    <StatusPill label="Autocompletado IA" tone="aqua" />
                  )}
                </View>

                <Text style={styles.cardTitle}>Finaliza tu acceso</Text>
                <Text style={styles.cardSubtitle}>
                  Verifica los datos leídos de tu cédula y define tu correo y clave.
                </Text>

                <LiquidInput
                  label="Nombre completo *"
                  hint={aiExtractedName ? 'Leído por IA' : undefined}
                  icon="user"
                  placeholder="Nombre y apellidos como en tu cédula"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />

                <LiquidInput
                  label="Número de cédula *"
                  hint={aiExtractedCedula ? 'Leído por IA' : undefined}
                  icon="idCard"
                  placeholder="6 a 10 dígitos sin puntos"
                  value={cedula}
                  onChangeText={(t) => setCedula(t.replace(/[^\d]/g, ''))}
                  keyboardType="numeric"
                  maxLength={10}
                />

                <LiquidInput
                  label="Correo electrónico *"
                  icon="mail"
                  placeholder="nombre@correo.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <LiquidInput
                  label="Teléfono celular (opcional)"
                  icon="phone"
                  placeholder="3001234567"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />

                <LiquidInput
                  label="Contraseña segura *"
                  icon="lock"
                  placeholder="Mínimo 8 caracteres, mayúscula y símbolo"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <PrismIcon
                        name={showPassword ? 'eyeOff' : 'eye'}
                        size={17}
                        color={palette.textMuted}
                      />
                    </TouchableOpacity>
                  }
                />

                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    <View style={styles.strengthTrack}>
                      {[1, 2, 3, 4, 5].map((idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.strengthSegment,
                            idx <= strength.level && { backgroundColor: strength.color },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthText, { color: strength.color }]}>
                      {strength.label}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.declarationCard,
                    acceptedTerms && styles.declarationCardActive,
                  ]}
                  onPress={() => setAcceptedTerms((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.checkCircle,
                      acceptedTerms && styles.checkCircleActive,
                    ]}
                  >
                    {acceptedTerms ? (
                      <PrismIcon name="check" size={13} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <Text style={styles.declarationText}>
                    Autorizo el cifrado AES-256 de mis datos biométricos conforme a la Ley 1581 de 2012 (Habeas Data).
                  </Text>
                </TouchableOpacity>

                <View style={styles.navRow}>
                  <LiquidPillButton
                    label="Atrás"
                    variant="glass"
                    icon="arrowLeft"
                    iconPosition="left"
                    onPress={() => {
                      setStepError(null);
                      setStep(2);
                    }}
                  />
                  <LiquidPillButton
                    label="Activar protección"
                    variant="obsidian"
                    icon="check"
                    loading={loading}
                    disabled={!acceptedTerms}
                    onPress={handleFinalSubmit}
                    style={styles.flex}
                  />
                </View>
              </LiquidGlassCard>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  shell: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  backChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
  },
  backChipText: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  brandMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  brandMiniText: {
    fontFamily: fontSans,
    fontSize: 13.5,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  stepperBar: {
    flexDirection: 'row',
    padding: 5,
    borderRadius: 999,
    gap: 4,
  },
  stepPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillCurrent: {
    backgroundColor: palette.obsidianPill,
  },
  stepPillDone: {
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
  },
  stepPillText: {
    fontFamily: fontSans,
    fontSize: 11.5,
    fontWeight: '600',
    color: palette.textMuted,
  },
  stepPillTextCurrent: {
    color: '#FFFFFF',
  },
  stepPillTextDone: {
    color: '#0369A1',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.crimsonTint,
    borderWidth: 1,
    borderColor: palette.crimsonBorder,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fontSans,
    fontSize: 13,
    color: palette.crimsonDeep,
  },
  cardTitle: {
    fontFamily: fontSans,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: palette.textPrimary,
    marginBottom: 5,
  },
  cardSubtitle: {
    fontFamily: fontSans,
    fontSize: 13.5,
    lineHeight: 19,
    color: palette.textSecondary,
    marginBottom: 18,
  },
  docBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.65)',
    padding: 15,
    marginBottom: 14,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  docTitle: {
    fontFamily: fontSans,
    fontSize: 14.5,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  aiScanBox: {
    paddingVertical: 26,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  aiScanTitle: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: '600',
    color: palette.textSecondary,
    textAlign: 'center',
  },
  captureWell: {
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(148, 163, 184, 0.55)',
    backgroundColor: 'rgba(248, 250, 252, 0.72)',
    alignItems: 'center',
    gap: 10,
  },
  captureHint: {
    fontFamily: fontSans,
    fontSize: 12.5,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  previewWrap: {
    alignItems: 'center',
    gap: 10,
  },
  previewImg: {
    width: '100%',
    height: 152,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  extractedTelemetryCard: {
    width: '100%',
    backgroundColor: 'rgba(240, 249, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
    gap: 3,
  },
  extractedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  extractedTypeText: {
    flex: 1,
    fontFamily: fontSans,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  extractedConfText: {
    fontFamily: fontSans,
    fontSize: 11,
    fontWeight: '700',
    color: palette.emerald,
  },
  extractedPrimaryText: {
    fontFamily: fontSans,
    fontSize: 14.5,
    fontWeight: '700',
    color: palette.textPrimary,
    marginTop: 2,
  },
  extractedSubText: {
    fontFamily: fontSans,
    fontSize: 12.5,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  selfieCenterStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  sculptedSelfieOrb: {
    width: 248,
    minHeight: 248,
    borderRadius: 124,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 22,
    gap: 12,
  },
  orbTitle: {
    fontFamily: fontSans,
    fontSize: 16.5,
    fontWeight: '700',
    color: palette.textPrimary,
    textAlign: 'center',
  },
  orbHint: {
    fontFamily: fontSans,
    fontSize: 12.5,
    color: palette.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  challengeCopy: {
    fontFamily: fontSans,
    fontSize: 13.5,
    fontWeight: '600',
    color: palette.textPrimary,
    textAlign: 'center',
    lineHeight: 19,
  },
  otherGestureLink: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  selfieCapturedWrap: {
    alignItems: 'center',
  },
  selfieBezel: {
    width: 194,
    height: 194,
    borderRadius: 97,
    padding: 6,
    backgroundColor: '#FFFFFF',
  },
  selfieImg: {
    width: '100%',
    height: '100%',
    borderRadius: 92,
  },
  step3BadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -4,
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  strengthTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.28)',
  },
  strengthText: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: '600',
  },
  declarationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.7)',
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  declarationCardActive: {
    borderColor: 'rgba(14, 165, 233, 0.55)',
    backgroundColor: 'rgba(240, 249, 255, 0.85)',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkCircleActive: {
    backgroundColor: palette.obsidianPill,
    borderColor: palette.obsidianPill,
  },
  declarationText: {
    flex: 1,
    fontFamily: fontSans,
    fontSize: 12.5,
    lineHeight: 18,
    color: palette.textSecondary,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
});
