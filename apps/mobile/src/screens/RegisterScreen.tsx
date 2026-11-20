import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, CameraViewProps, useCameraPermissions } from 'expo-camera';
import { authService } from '../services/auth';
import { showAlert } from '../utils/dialogs';
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

const FrontLiveCamera = CameraView as unknown as React.ComponentType<
  CameraViewProps & { ref?: any }
>;

interface RegisterScreenProps {
  onRegister: () => void;
  onGoLogin: () => void;
}

const STEP_META: { id: 1 | 2 | 3; label: string }[] = [
  { id: 1, label: '1. Tu Cédula' },
  { id: 2, label: '2. Tu Rostro' },
  { id: 3, label: '3. Tu Cuenta' },
];

type GuidanceTone = 'neutral' | 'amber' | 'aqua' | 'emerald' | 'crimson';

export default function RegisterScreen({ onRegister, onGoLogin }: RegisterScreenProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [camPermission, requestCamPermission] = useCameraPermissions();

  // Datos autocompletados por IA + credenciales finales
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

  // Paso 1: Cédula
  const [idCardFront, setIdCardFront] = useState<string | null>(null);
  const [idCardBack, setIdCardBack] = useState<string | null>(null);
  const [analyzingSide, setAnalyzingSide] = useState<'front' | 'back' | null>(null);

  // Paso 2: Asistente Visual Paciente (Sin límite de segundos + Antisuplantación en Vivo)
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [verifyingFinalMatch, setVerifyingFinalMatch] = useState(false);
  const [guideStageLabel, setGuideStageLabel] = useState('Paso 1 de 2 · Ubicación');
  const [guideText, setGuideText] = useState('Ubica tu rostro frente a la pantalla, sin prisa');
  const [guideTone, setGuideTone] = useState<GuidanceTone>('neutral');

  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [livenessProofToken, setLivenessProofToken] = useState<string | null>(null);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [biometricScore, setBiometricScore] = useState<number | null>(null);

  // Paso 3: Confirmación
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const loopActiveRef = useRef(false);
  const neutralFrameRef = useRef<string | null>(null);
  const activeTokenRef = useRef<string | null>(null);
  const currentStageRef = useRef<'align_neutral' | 'perform_gesture'>('align_neutral');

  const stopLiveLoop = useCallback(() => {
    loopActiveRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      stopLiveLoop();
    };
  }, [stopLiveLoop]);

  const reportError = (title: string, message: string) => {
    setStepError(message);
    showAlert(title, message, { showOnWeb: false });
  };

  const resetBiometrics = useCallback(() => {
    stopLiveLoop();
    neutralFrameRef.current = null;
    activeTokenRef.current = null;
    currentStageRef.current = 'align_neutral';
    setScannerOpen(false);
    setCameraReady(false);
    setVerifyingFinalMatch(false);
    setGuideStageLabel('Paso 1 de 2 · Ubicación');
    setGuideText('Ubica tu rostro frente a la pantalla, sin prisa');
    setGuideTone('neutral');
    setSelfiePhoto(null);
    setLivenessProofToken(null);
    setBiometricVerified(false);
    setBiometricScore(null);
  }, [stopLiveLoop]);

  const normalizeWebImage = async (uri: string, maxDim = 1280, quality = 0.82): Promise<string> => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return uri;
    return new Promise<string>((resolve) => {
      const img = new window.Image();
      img.onload = () => {
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
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(uri);
      img.src = uri;
    });
  };

  // Abrir automáticamente el asistente visual al llegar al Paso 2
  const openFrontLiveScanner = useCallback(async () => {
    setStepError(null);
    if (!idCardFront) {
      setStep(1);
      return;
    }

    if (!camPermission?.granted) {
      const perm = await requestCamPermission();
      if (!perm.granted) {
        reportError(
          'Permiso de cámara',
          'Necesitamos encender la cámara frontal para guiarte paso a paso.'
        );
        return;
      }
    }

    neutralFrameRef.current = null;
    activeTokenRef.current = null;
    currentStageRef.current = 'align_neutral';
    setGuideStageLabel('Paso 1 de 2 · Ubicación');
    setGuideText('Mira tranquilo hacia el centro de la pantalla');
    setGuideTone('neutral');
    setCameraReady(false);
    setScannerOpen(true);
  }, [camPermission?.granted, idCardFront, requestCamPermission]);

  useEffect(() => {
    if (step === 2 && !biometricVerified && !scannerOpen && !verifyingFinalMatch && idCardFront) {
      openFrontLiveScanner();
    }
  }, [step, biometricVerified, scannerOpen, verifyingFinalMatch, idCardFront, openFrontLiveScanner]);

  // Captura silenciosa sin flash ni sonido de obturador
  const captureSilentFrame = async (highQuality = false): Promise<string | null> => {
    if (!cameraRef.current) return null;
    try {
      const snap = await cameraRef.current.takePictureAsync({
        quality: highQuality ? 0.76 : 0.48,
        base64: true,
        shutterSound: false,
      });
      if (snap?.base64) {
        return `data:image/jpeg;base64,${snap.base64}`;
      }
      if (snap?.uri) {
        return Platform.OS === 'web'
          ? await normalizeWebImage(snap.uri, highQuality ? 1280 : 720, highQuality ? 0.84 : 0.72)
          : snap.uri;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Bucle inteligente guiado por eventos (SIN relojes ni límite de segundos para lectura tranquila)
  const startPatientVisionAssistant = useCallback(async () => {
    if (loopActiveRef.current || !idCardFront) return;
    loopActiveRef.current = true;

    try {
      const challenge = await authService.getLivenessChallenge();
      activeTokenRef.current = challenge.challengeToken;
      currentStageRef.current = 'align_neutral';
      setGuideStageLabel('Paso 1 de 2 · Mirada al frente');
      setGuideText(challenge.step1Prompt);
      setGuideTone('neutral');

      let startedAt = Date.now();

      while (loopActiveRef.current) {
        // Pausa preventiva de ahorro de batería solo si pasan 2 minutos continuos de inactividad
        if (Date.now() - startedAt > 120000) {
          loopActiveRef.current = false;
          setScannerOpen(false);
          setGuideText('Pausamos la cámara para cuidar tu batería. Toca iniciar cuando estés listo.');
          return;
        }

        const isGestureStage = currentStageRef.current === 'perform_gesture';
        const frame = await captureSilentFrame(true);

        if (!loopActiveRef.current) return;

        if (!frame || !activeTokenRef.current) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        try {
          const probe = await authService.probeLiveness({
            stage: currentStageRef.current,
            frameBase64: frame,
            token: activeTokenRef.current,
          });

          if (!loopActiveRef.current) return;

          if (probe.nextToken && probe.status !== 'gesture_locked') {
            activeTokenRef.current = probe.nextToken;
          }

          setGuideText((prev) => (prev === probe.guidance ? prev : probe.guidance));
          setGuideTone((prev) => (prev === probe.tone ? prev : probe.tone));

          if (probe.status === 'spoof_blocked') {
            if (Platform.OS !== 'web') Vibration.vibrate(120);
            // Si intentaron meter una foto o cédula en mitad de la prueba, reiniciar al Paso 1
            if (isGestureStage) {
              const fresh = await authService.getLivenessChallenge();
              activeTokenRef.current = fresh.challengeToken;
              neutralFrameRef.current = null;
              currentStageRef.current = 'align_neutral';
              setGuideStageLabel('Paso 1 de 2 · Mirada al frente');
            }
          } else if (probe.status === 'neutral_locked') {
            // ¡La persona ya está mirando bien a la pantalla! Guardamos su foto base y pasamos al gesto sin prisa
            neutralFrameRef.current = frame;
            currentStageRef.current = 'perform_gesture';
            startedAt = Date.now();
            setGuideStageLabel('Paso 2 de 2 · Tu gesto en vivo');
            if (Platform.OS !== 'web') Vibration.vibrate(55);
          } else if (probe.status === 'gesture_locked' && neutralFrameRef.current && probe.nextToken) {
            // ¡Gesto completado en vivo! Cerramos cámara y cruzamos identidad contra la cédula
            loopActiveRef.current = false;
            if (Platform.OS !== 'web') Vibration.vibrate([0, 55, 65, 55]);

            const savedNeutral = neutralFrameRef.current;
            const finalToken = probe.nextToken;

            setScannerOpen(false);
            setCameraReady(false);
            setVerifyingFinalMatch(true);

            try {
              const finalMatch = await authService.verifyBiometrics({
                idCardFront,
                selfieNeutral: savedNeutral,
                selfiePhoto: frame,
                challengeToken: finalToken,
              });

              setSelfiePhoto(savedNeutral);
              setLivenessProofToken(finalMatch.livenessProofToken);
              setBiometricVerified(true);
              setBiometricScore(finalMatch.similarityScore);
              setVerifyingFinalMatch(false);

              setTimeout(() => setStep(3), 650);
            } catch (matchErr: any) {
              setVerifyingFinalMatch(false);
              resetBiometrics();
              const msg =
                matchErr?.response?.data?.message ||
                'Tu rostro en vivo no coincide con la fotografía de la cédula escaneada.';
              reportError('Identidad no coincide', msg);
            }
            return;
          }
        } catch {
          // Ignorar microcortes de red momentáneos y seguir guiando con calma
        }

        await new Promise((r) => setTimeout(r, 750));
      }
    } catch {
      loopActiveRef.current = false;
      setScannerOpen(false);
      reportError('Conexión interrumpida', 'Revisa tu señal e intenta nuevamente.');
    }
  }, [idCardFront, resetBiometrics]);

  useEffect(() => {
    if (scannerOpen && cameraReady && !loopActiveRef.current) {
      startPatientVisionAssistant();
    }
  }, [scannerOpen, cameraReady, startPatientVisionAssistant]);

  // Escaneo de Cédula (Paso 1)
  const handleCaptureDocument = async (target: 'idFront' | 'idBack') => {
    setStepError(null);
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        reportError('Permiso requerido', 'Permite el uso de la cámara para fotografiar tu cédula.');
        return;
      }
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
        cameraType: ImagePicker.CameraType.back,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      let dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      if (Platform.OS === 'web' && asset.uri) {
        dataUri = await normalizeWebImage(asset.uri, 1600, 0.86);
      }

      const isFront = target === 'idFront';
      const side: 'front' | 'back' = isFront ? 'front' : 'back';
      setAnalyzingSide(side);
      if (isFront) {
        resetBiometrics();
      }

      try {
        const analysis = await authService.analyzeDocument({
          imageBase64: dataUri,
          side,
        });

        if (isFront) {
          setIdCardFront(dataUri);
          setDetectedDocType(analysis.documentType || 'Cédula de Ciudadanía');
          setDocFaceConfidence(analysis.faceConfidence);
        } else {
          setIdCardBack(dataUri);
        }

        if (analysis.detectedFullName && (isFront || !fullName)) {
          setFullName(analysis.detectedFullName);
          setAiExtractedName(true);
        }
        if (analysis.detectedCedula && (isFront || !cedula)) {
          setCedula(analysis.detectedCedula);
          setAiExtractedCedula(true);
        }

        if (Platform.OS !== 'web') Vibration.vibrate(45);
        const oppositeSideReady = isFront ? Boolean(idCardBack) : Boolean(idCardFront);
        if (oppositeSideReady) {
          setTimeout(() => setStep(2), isFront ? 500 : 550);
        }
      } catch (err: any) {
        if (isFront) {
          setIdCardFront(null);
          reportError(
            'Toma otra foto del frente',
            err?.response?.data?.message ||
              'No pudimos ver bien tu foto en la cédula. Ponla sobre una mesa con buena luz.'
          );
        } else {
          setIdCardBack(null);
          reportError(
            'Toma otra foto del respaldo',
            err?.response?.data?.message ||
              'Se vio algo borroso o con brillo. Acerca un poquito más el celular.'
          );
        }
      } finally {
        setAnalyzingSide(null);
      }
    } catch {
      reportError('Cámara no disponible', 'No pudimos abrir la cámara del teléfono.');
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
    if (!idCardFront || !idCardBack || !selfiePhoto || !biometricVerified || !livenessProofToken) {
      reportError('Verificación pendiente', 'Completa primero la validación de tu rostro.');
      return;
    }
    if (!fullName.trim() || !cedula.trim() || !email.trim() || !password) {
      reportError('Datos pendientes', 'Escribe tu correo electrónico y crea una contraseña.');
      return;
    }
    if (!/^\d{6,10}$/.test(cedula.trim())) {
      reportError('Cédula inválida', 'Revisa que tu número de cédula tenga de 6 a 10 números.');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      reportError('Correo inválido', 'Revisa cómo escribiste tu correo electrónico.');
      return;
    }
    const passError = validatePassword(password);
    if (passError) {
      reportError('Contraseña insegura', passError);
      return;
    }
    if (!acceptedTerms) {
      reportError(
        'Falta tu autorización',
        'Toca el recuadro para autorizar la protección de tus datos.'
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
        livenessProofToken,
      });

      if (Platform.OS !== 'web') Vibration.vibrate(60);
      onRegister();
    } catch (e: any) {
      let msg = 'No se pudo completar el registro.';
      if (!e.response) {
        msg = 'No hubo conexión con el servidor. Revisa tu internet.';
      } else if (e.response?.data?.message) {
        msg = e.response.data.message;
      }
      reportError('No se pudo crear la cuenta', msg);
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

  const ovalBorderColor =
    guideTone === 'crimson'
      ? palette.crimson
      : guideTone === 'emerald'
      ? palette.emeraldBright
      : guideTone === 'aqua'
      ? palette.aqua
      : guideTone === 'amber'
      ? palette.amber
      : '#FFFFFF';

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
                onPress={() => {
                  resetBiometrics();
                  onGoLogin();
                }}
                activeOpacity={0.75}
                style={styles.backChip}
              >
                <PrismIcon name="arrowLeft" size={14} color={palette.textPrimary} />
                <Text style={styles.backChipText}>Ya tengo cuenta</Text>
              </TouchableOpacity>

              <View style={styles.brandMini}>
                <PrismEmblem size={28} />
                <Text style={styles.brandMiniText}>Registro asistido</Text>
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
                <PrismIcon name="alert" size={18} color={palette.crimson} />
                <Text style={styles.errorBannerText}>{stepError}</Text>
              </View>
            ) : null}

            {/* ============================================================== */}
            {/* PASO 1: LECTURA AUTOMÁTICA DE CÉDULA                           */}
            {/* ============================================================== */}
            {step === 1 && (
              <LiquidGlassCard strong blurPx={34}>
                <Text style={styles.cardTitle}>Fotografía tu cédula</Text>
                <Text style={styles.cardSubtitle}>
                  Nosotros leeremos tu nombre y número automáticamente para que no tengas que escribirlos.
                </Text>

                {/* Frente */}
                <View style={styles.docBox}>
                  <View style={styles.docHeader}>
                    <Text style={styles.docTitle}>1. Frente (lado de tu foto)</Text>
                    <StatusPill
                      label={
                        analyzingSide === 'front'
                          ? 'Leyendo...'
                          : idCardFront
                          ? 'Listo'
                          : 'Falta'
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
                        Leyendo tu nombre y número de documento...
                      </Text>
                    </View>
                  ) : idCardFront ? (
                    <View style={styles.previewWrap}>
                      <Image
                        source={{ uri: idCardFront }}
                        style={styles.previewImg}
                        resizeMode="cover"
                      />

                      <View style={styles.extractedTelemetryCard}>
                        <View style={styles.extractedHeaderRow}>
                          <PrismIcon name="check" size={14} color={palette.emerald} />
                          <Text style={styles.extractedTypeText}>{detectedDocType}</Text>
                          {docFaceConfidence ? (
                            <Text style={styles.extractedConfText}>Foto clara</Text>
                          ) : null}
                        </View>
                        {fullName ? (
                          <Text style={styles.extractedPrimaryText}>{fullName}</Text>
                        ) : null}
                        {cedula ? (
                          <Text style={styles.extractedSubText}>Cédula: {cedula}</Text>
                        ) : null}
                      </View>

                      <LiquidPillButton
                        label="Tomar otra foto del frente"
                        variant="glass"
                        size="sm"
                        icon="refresh"
                        iconPosition="left"
                        onPress={() => handleCaptureDocument('idFront')}
                      />
                    </View>
                  ) : (
                    <View style={styles.captureWell}>
                      <PrismIcon name="idCard" size={30} color={palette.aqua} />
                      <Text style={styles.captureHint}>
                        Pon tu cédula sobre una mesa iluminada y tómale foto al frente
                      </Text>
                      <LiquidPillButton
                        label="Tomar foto del frente"
                        variant="obsidian"
                        size="md"
                        icon="camera"
                        iconPosition="left"
                        onPress={() => handleCaptureDocument('idFront')}
                      />
                    </View>
                  )}
                </View>

                {/* Reverso */}
                <View style={styles.docBox}>
                  <View style={styles.docHeader}>
                    <Text style={styles.docTitle}>2. Respaldo (lado de atrás)</Text>
                    <StatusPill
                      label={
                        analyzingSide === 'back'
                          ? 'Revisando...'
                          : idCardBack
                          ? 'Listo'
                          : 'Falta'
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
                      <Text style={styles.aiScanTitle}>Revisando el respaldo de tu cédula...</Text>
                    </View>
                  ) : idCardBack ? (
                    <View style={styles.previewWrap}>
                      <Image
                        source={{ uri: idCardBack }}
                        style={styles.previewImg}
                        resizeMode="cover"
                      />
                      <LiquidPillButton
                        label="Tomar otra foto del respaldo"
                        variant="glass"
                        size="sm"
                        icon="refresh"
                        iconPosition="left"
                        onPress={() => handleCaptureDocument('idBack')}
                      />
                    </View>
                  ) : (
                    <View style={styles.captureWell}>
                      <PrismIcon name="scan" size={28} color={palette.aqua} />
                      <Text style={styles.captureHint}>
                        Voltea tu cédula y tómale foto a la parte de atrás
                      </Text>
                      <LiquidPillButton
                        label="Tomar foto del respaldo"
                        variant="obsidian"
                        size="md"
                        icon="camera"
                        iconPosition="left"
                        disabled={!idCardFront || analyzingSide !== null}
                        onPress={() => handleCaptureDocument('idBack')}
                      />
                    </View>
                  )}
                </View>

                {idCardFront && idCardBack && analyzingSide === null ? (
                  <LiquidPillButton
                    label="Seguir a tu rostro"
                    variant="obsidian"
                    size="lg"
                    icon="arrowRight"
                    onPress={() => setStep(2)}
                  />
                ) : null}
              </LiquidGlassCard>
            )}

            {/* ============================================================== */}
            {/* PASO 2: ASISTENTE VISUAL PACIENTE Y ANTIFRAUDE (SIN SEGUNDOS)  */}
            {/* ============================================================== */}
            {step === 2 && (
              <LiquidGlassCard strong blurPx={34}>
                <Text style={styles.cardTitle}>Mirémonos un momento</Text>
                <Text style={styles.cardSubtitle}>
                  Sin afán ni conteos: lee tranquilo la indicación de abajo y la cámara avanzará sola cuando te vea.
                </Text>

                <View style={styles.selfieCenterStage}>
                  {scannerOpen ? (
                    <View style={styles.liveScannerStage}>
                      <View
                        style={[
                          styles.liveOvalFrame,
                          { borderColor: ovalBorderColor },
                          sculptedShadow(),
                        ]}
                      >
                        <FrontLiveCamera
                          ref={(r: CameraView | null) => {
                            cameraRef.current = r;
                          }}
                          style={StyleSheet.absoluteFill}
                          facing="front"
                          mute={true}
                          animateShutter={false}
                          onCameraReady={() => setCameraReady(true)}
                        />
                      </View>

                      {/* Tarjeta grande y legible de acompañamiento paso a paso */}
                      <View
                        style={[
                          styles.livePromptCard,
                          guideTone === 'aqua' && styles.livePromptCardAqua,
                          guideTone === 'crimson' && styles.livePromptCardCrimson,
                          guideTone === 'emerald' && styles.livePromptCardEmerald,
                        ]}
                      >
                        <StatusPill label={guideStageLabel} tone={guideTone} />
                        <Text
                          style={[
                            styles.livePromptBigText,
                            guideTone === 'crimson' && { color: palette.crimsonDeep },
                          ]}
                        >
                          {guideText}
                        </Text>
                      </View>
                    </View>
                  ) : verifyingFinalMatch ? (
                    <View style={[styles.sculptedSelfieOrb, sculptedShadow()]}>
                      <ActivityIndicator size="large" color={palette.aqua} />
                      <Text style={styles.orbTitle}>Confirmando tu identidad</Text>
                      <Text style={styles.orbHint}>
                        Comparando tu rostro con la foto de tu cédula...
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
                      <View style={{ marginTop: 14 }}>
                        <StatusPill
                          label={
                            biometricScore !== null
                              ? `¡Identidad confirmada! (${Math.round(biometricScore)}%)`
                              : '¡Identidad confirmada!'
                          }
                          tone="emerald"
                        />
                      </View>
                      <LiquidPillButton
                        label="Volver a tomar"
                        variant="glass"
                        size="sm"
                        icon="refresh"
                        iconPosition="left"
                        onPress={() => {
                          resetBiometrics();
                          openFrontLiveScanner();
                        }}
                        style={{ marginTop: 12 }}
                      />
                    </View>
                  ) : (
                    <View style={[styles.sculptedSelfieOrb, sculptedShadow()]}>
                      <PrismIcon name="scan" size={36} color={palette.aqua} />
                      <Text style={styles.orbTitle}>Encender cámara frontal</Text>
                      <Text style={styles.orbHint}>
                        Te iremos indicando con letras grandes cuándo mirar al frente y sonreír, a tu propio ritmo.
                      </Text>
                      <LiquidPillButton
                        label="Comenzar ahora"
                        variant="obsidian"
                        size="md"
                        icon="camera"
                        iconPosition="left"
                        onPress={openFrontLiveScanner}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.navRow}>
                  <LiquidPillButton
                    label="Atrás"
                    variant="glass"
                    icon="arrowLeft"
                    iconPosition="left"
                    disabled={verifyingFinalMatch}
                    onPress={() => {
                      resetBiometrics();
                      setStepError(null);
                      setStep(1);
                    }}
                  />
                  {biometricVerified && livenessProofToken ? (
                    <LiquidPillButton
                      label="Continuar"
                      variant="obsidian"
                      icon="arrowRight"
                      onPress={() => setStep(3)}
                      style={styles.flex}
                    />
                  ) : null}
                </View>
              </LiquidGlassCard>
            )}

            {/* ============================================================== */}
            {/* PASO 3: DATOS AUTOCOMPLETADOS + CREDENCIAL DE ACCESO           */}
            {/* ============================================================== */}
            {step === 3 && (
              <LiquidGlassCard strong blurPx={34}>
                <View style={styles.step3BadgeRow}>
                  <StatusPill label="Identidad verificada en vivo" tone="emerald" />
                  {(aiExtractedName || aiExtractedCedula) && (
                    <StatusPill label="Datos leídos de tu cédula" tone="aqua" />
                  )}
                </View>

                <Text style={styles.cardTitle}>Último paso</Text>
                <Text style={styles.cardSubtitle}>
                  Revisa que tu nombre y cédula estén bien escritos, y elige tu correo y contraseña.
                </Text>

                <LiquidInput
                  label="Tu nombre completo *"
                  hint={aiExtractedName ? 'Automático' : undefined}
                  icon="user"
                  placeholder="Nombre y apellidos"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />

                <LiquidInput
                  label="Tu número de cédula *"
                  hint={aiExtractedCedula ? 'Automático' : undefined}
                  icon="idCard"
                  placeholder="Sin puntos ni espacios"
                  value={cedula}
                  onChangeText={(t) => setCedula(t.replace(/[^\d]/g, ''))}
                  keyboardType="numeric"
                  maxLength={10}
                />

                <LiquidInput
                  label="Tu correo electrónico *"
                  icon="mail"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <LiquidInput
                  label="Tu celular (opcional)"
                  icon="phone"
                  placeholder="3001234567"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />

                <LiquidInput
                  label="Crea una contraseña *"
                  icon="lock"
                  placeholder="Mínimo 8 letras, 1 mayúscula, número y símbolo"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <PrismIcon
                        name={showPassword ? 'eyeOff' : 'eye'}
                        size={18}
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
                      <PrismIcon name="check" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <Text style={styles.declarationText}>
                    Autorizo proteger y cifrar mis datos de identidad conforme a la Ley 1581 de 2012 (Habeas Data).
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
                    label="Crear mi cuenta"
                    variant="obsidian"
                    size="lg"
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
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  backChipText: {
    fontFamily: fontSans,
    fontSize: 13.5,
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
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillCurrent: {
    backgroundColor: palette.obsidianPill,
  },
  stepPillDone: {
    backgroundColor: 'rgba(14, 165, 233, 0.14)',
  },
  stepPillText: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: '700',
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
    borderWidth: 1.5,
    borderColor: palette.crimsonBorder,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fontSans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: palette.crimsonDeep,
  },
  cardTitle: {
    fontFamily: fontSans,
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: palette.textPrimary,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontFamily: fontSans,
    fontSize: 15,
    lineHeight: 21,
    color: palette.textSecondary,
    marginBottom: 18,
  },
  docBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.7)',
    padding: 16,
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
    fontSize: 15.5,
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
    fontSize: 14.5,
    fontWeight: '600',
    color: palette.textSecondary,
    textAlign: 'center',
  },
  captureWell: {
    paddingVertical: 20,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(148, 163, 184, 0.6)',
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    alignItems: 'center',
    gap: 12,
  },
  captureHint: {
    fontFamily: fontSans,
    fontSize: 14,
    lineHeight: 20,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 270,
  },
  previewWrap: {
    alignItems: 'center',
    gap: 10,
  },
  previewImg: {
    width: '100%',
    height: 156,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  extractedTelemetryCard: {
    width: '100%',
    backgroundColor: 'rgba(240, 249, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.45)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  extractedConfText: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: '700',
    color: palette.emerald,
  },
  extractedPrimaryText: {
    fontFamily: fontSans,
    fontSize: 16,
    fontWeight: '700',
    color: palette.textPrimary,
    marginTop: 2,
  },
  extractedSubText: {
    fontFamily: fontSans,
    fontSize: 14,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  selfieCenterStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  liveScannerStage: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  liveOvalFrame: {
    width: 244,
    height: 300,
    borderRadius: 122,
    overflow: 'hidden',
    borderWidth: 4.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#0F172A',
  },
  livePromptCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(203, 213, 225, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 15,
    alignItems: 'center',
    gap: 8,
  },
  livePromptCardAqua: {
    borderColor: palette.aqua,
    backgroundColor: 'rgba(240, 249, 255, 0.98)',
  },
  livePromptCardCrimson: {
    borderColor: palette.crimson,
    backgroundColor: palette.crimsonTint,
  },
  livePromptCardEmerald: {
    borderColor: palette.emeraldBright,
    backgroundColor: 'rgba(236, 253, 245, 0.98)',
  },
  livePromptBigText: {
    fontFamily: fontSans,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    color: palette.textPrimary,
    textAlign: 'center',
  },
  sculptedSelfieOrb: {
    width: 264,
    minHeight: 264,
    borderRadius: 132,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
  },
  orbTitle: {
    fontFamily: fontSans,
    fontSize: 18,
    fontWeight: '700',
    color: palette.textPrimary,
    textAlign: 'center',
  },
  orbHint: {
    fontFamily: fontSans,
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  selfieCapturedWrap: {
    alignItems: 'center',
  },
  selfieBezel: {
    width: 198,
    height: 198,
    borderRadius: 99,
    padding: 6,
    backgroundColor: '#FFFFFF',
  },
  selfieImg: {
    width: '100%',
    height: '100%',
    borderRadius: 93,
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
    fontSize: 12.5,
    fontWeight: '600',
  },
  declarationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(203, 213, 225, 0.75)',
    padding: 15,
    marginTop: 4,
    marginBottom: 16,
  },
  declarationCardActive: {
    borderColor: 'rgba(14, 165, 233, 0.6)',
    backgroundColor: 'rgba(240, 249, 255, 0.9)',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontSize: 13.5,
    lineHeight: 19,
    color: palette.textSecondary,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
});
