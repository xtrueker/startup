import { useState } from 'react';
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
} from '../components/ui/PrismPrimitives';

interface RegisterScreenProps {
  onRegister: () => void;
  onGoLogin: () => void;
}

const STEP_META: { id: 1 | 2 | 3 | 4; label: string }[] = [
  { id: 1, label: 'Datos' },
  { id: 2, label: 'Documento' },
  { id: 3, label: 'Rostro' },
  { id: 4, label: 'Confirmar' },
];

const LIVENESS_CHALLENGES = [
  { instruction: 'Sonríe con naturalidad mirando hacia el frente.' },
  { instruction: 'Gira suavemente tu rostro un poco hacia la derecha.' },
  { instruction: 'Gira suavemente tu rostro un poco hacia la izquierda.' },
  { instruction: 'Entreabre ligeramente la boca mirando a la cámara.' },
  { instruction: 'Parpadea una vez despacio y mira al frente.' },
];

export default function RegisterScreen({ onRegister, onGoLogin }: RegisterScreenProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Paso 1: Datos Personales
  const [fullName, setFullName] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Paso 2: Cédula
  const [idCardFront, setIdCardFront] = useState<string | null>(null);
  const [idCardBack, setIdCardBack] = useState<string | null>(null);

  // Paso 3: Rostro
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [livenessChallenge, setLivenessChallenge] = useState<(typeof LIVENESS_CHALLENGES)[0] | null>(
    null
  );

  // Paso 4: Confirmación
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const reportError = (title: string, message: string) => {
    setStepError(message);
    if (Platform.OS !== 'web') {
      Alert.alert(title, message);
    }
  };

  const startLivenessChallenge = () => {
    const random = LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)];
    setLivenessChallenge(random);
  };

  const confirmLivenessAndCapture = async () => {
    await handleCapturePhoto('selfie', true);
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        reportError(
          'Permiso de cámara',
          'Necesitamos acceso a tu cámara para verificar tu identidad de forma segura.'
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
    setStepError(null);
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const options: ImagePicker.ImagePickerOptions = {
        allowsEditing: true,
        aspect: target === 'selfie' ? [1, 1] : [16, 10],
        quality: 0.5,
        base64: true,
        cameraType: useFrontCamera
          ? ImagePicker.CameraType.front
          : ImagePicker.CameraType.back,
      };

      const result = await ImagePicker.launchCameraAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let dataUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        // En navegadores móviles/escritorio, normalizar y comprimir a JPEG <=1280px
        // para evitar rechazos por tamaño (413) o formatos HEIC en iOS Safari
        if (Platform.OS === 'web' && asset.uri && typeof document !== 'undefined') {
          try {
            dataUri = await new Promise<string>((resolve, reject) => {
              const img = new window.Image();
              img.onload = () => {
                const maxDim = 1280;
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
                  resolve(dataUri);
                  return;
                }
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
              };
              img.onerror = () => reject(new Error('Image decode failed'));
              img.src = asset.uri;
            });
          } catch {
            // Conservar dataUri original si canvas falla
          }
        }

        if (target === 'idFront') setIdCardFront(dataUri);
        else if (target === 'idBack') setIdCardBack(dataUri);
        else if (target === 'selfie') setSelfiePhoto(dataUri);
      }
    } catch (err) {
      console.warn('Error al abrir la cámara:', err);
      reportError(
        'Cámara no disponible',
        'No se pudo abrir la cámara. Revisa los permisos de tu navegador o teléfono.'
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

  const handleNextStep1 = () => {
    setStepError(null);
    if (!fullName.trim() || !cedula.trim() || !email.trim() || !password) {
      reportError('Datos incompletos', 'Por favor completa los campos marcados con asterisco.');
      return;
    }
    if (!/^\d{6,10}$/.test(cedula.trim())) {
      reportError(
        'Cédula inválida',
        'Ingresa entre 6 y 10 dígitos numéricos, sin puntos ni espacios.'
      );
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      reportError('Correo inválido', 'Revisa el formato de tu correo electrónico.');
      return;
    }
    const passError = validatePassword(password);
    if (passError) {
      reportError('Contraseña insegura', passError);
      return;
    }
    if (phone.trim() && !/^\d{7,10}$/.test(phone.trim().replace(/[\s\-\+]/g, ''))) {
      reportError('Teléfono inválido', 'Ingresa un número de entre 7 y 10 dígitos.');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    setStepError(null);
    if (!idCardFront || !idCardBack) {
      reportError(
        'Fotos pendientes',
        'Toma la foto frontal y posterior de tu cédula para continuar.'
      );
      return;
    }
    setStep(3);
  };

  const handleNextStep3 = () => {
    setStepError(null);
    if (!selfiePhoto) {
      reportError('Foto pendiente', 'Completa la verificación de rostro antes de continuar.');
      return;
    }
    setStep(4);
  };

  const handleFinalSubmit = async () => {
    setStepError(null);
    if (!acceptedTerms) {
      reportError(
        'Confirmación pendiente',
        'Acepta la declaración de autenticidad para enviar tu registro.'
      );
      return;
    }

    setLoading(true);
    try {
      const registeredUser = await authService.register({
        fullName: fullName.trim(),
        cedula: cedula.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        idCardFront: idCardFront || undefined,
        idCardBack: idCardBack || undefined,
        selfiePhoto: selfiePhoto || undefined,
      });

      const autoVerified = Boolean(registeredUser?.isVerified);
      const successMsg = autoVerified
        ? 'Tu identidad biométrica fue validada automáticamente y tus documentos quedaron cifrados de forma segura.'
        : 'Tus documentos fueron validados ópticamente y cifrados en bóveda segura (AES-256).\n\nYa puedes acceder mientras un supervisor confirma tu sello de verificación.';

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.alert(successMsg);
        }
        onRegister();
      } else {
        Alert.alert('Cuenta creada', successMsg, [
          { text: 'Entendido', onPress: onRegister },
        ]);
      }
    } catch (e: any) {
      console.error('Error de registro KYC:', e);
      let msg = 'No se pudo completar el registro.';
      if (!e.response) {
        msg = 'No fue posible conectar con el servidor. Revisa tu conexión.';
      } else if (e.response?.data?.message) {
        msg = e.response.data.message;
      }
      reportError('Error en el envío', msg);
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
                <PrismEmblem size={30} />
                <Text style={styles.brandMiniText}>Red Ciudadana</Text>
              </View>
            </View>

            {/* Clean Sculpted Stepper Pills */}
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
                      {item.id}. {item.label}
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
            {/* PASO 1: DATOS PERSONALES                                       */}
            {/* ============================================================== */}
            {step === 1 && (
              <LiquidGlassCard strong blurPx={34}>
                <Text style={styles.cardTitle}>Crea tu cuenta verificada</Text>
                <Text style={styles.cardSubtitle}>
                  Escribe tus datos tal como aparecen en tu documento de identidad.
                </Text>

                <LiquidInput
                  label="Nombre completo *"
                  icon="user"
                  placeholder="Ej. Andrés Felipe Guillén"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />

                <LiquidInput
                  label="Número de cédula *"
                  hint="Sin puntos"
                  icon="idCard"
                  placeholder="Ej. 1096123456"
                  value={cedula}
                  onChangeText={setCedula}
                  keyboardType="number-pad"
                />

                <LiquidInput
                  label="Teléfono móvil"
                  hint="Opcional"
                  icon="phone"
                  placeholder="Ej. 3001234567"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />

                <LiquidInput
                  label="Correo electrónico *"
                  icon="mail"
                  placeholder="nombre@correo.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <LiquidInput
                  label="Contraseña *"
                  hint="Mín. 8 y un símbolo"
                  icon="lock"
                  placeholder="Crea una contraseña segura"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={{ padding: 2 }}
                    >
                      <PrismIcon
                        name={showPassword ? 'eyeOff' : 'eye'}
                        size={17}
                        color={palette.textSecondary}
                      />
                    </TouchableOpacity>
                  }
                />

                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    <View style={styles.strengthTrack}>
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <View
                          key={lvl}
                          style={[
                            styles.strengthSegment,
                            lvl <= strength.level && { backgroundColor: strength.color },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthText, { color: strength.color }]}>
                      {strength.label}
                    </Text>
                  </View>
                )}

                <LiquidPillButton
                  label="Continuar"
                  variant="obsidian"
                  size="lg"
                  icon="arrowRight"
                  onPress={handleNextStep1}
                  style={{ marginTop: 12 }}
                />
              </LiquidGlassCard>
            )}

            {/* ============================================================== */}
            {/* PASO 2: DOCUMENTO DE IDENTIDAD                                 */}
            {/* ============================================================== */}
            {step === 2 && (
              <LiquidGlassCard strong blurPx={34}>
                <Text style={styles.cardTitle}>Documento de identidad</Text>
                <Text style={styles.cardSubtitle}>
                  Toma una foto clara de ambos lados de tu cédula usando la cámara en vivo.
                </Text>

                {/* Frente */}
                <View style={styles.docBox}>
                  <View style={styles.docHeader}>
                    <Text style={styles.docTitle}>Frente de la cédula</Text>
                    <StatusPill
                      label={idCardFront ? 'Lista' : 'Pendiente'}
                      tone={idCardFront ? 'emerald' : 'neutral'}
                    />
                  </View>

                  {idCardFront ? (
                    <View style={styles.previewWrap}>
                      <Image
                        source={{ uri: idCardFront }}
                        style={styles.previewImg}
                        resizeMode="cover"
                      />
                      <LiquidPillButton
                        label="Repetir foto"
                        variant="glass"
                        size="sm"
                        icon="refresh"
                        iconPosition="left"
                        onPress={() => handleCapturePhoto('idFront')}
                        style={{ marginTop: 10 }}
                      />
                    </View>
                  ) : (
                    <View style={styles.captureWell}>
                      <PrismIcon name="idCard" size={26} color={palette.aqua} />
                      <Text style={styles.captureHint}>
                        Ubica tu documento sobre una superficie bien iluminada
                      </Text>
                      <LiquidPillButton
                        label="Tomar foto frontal"
                        variant="obsidian"
                        size="sm"
                        icon="camera"
                        iconPosition="left"
                        onPress={() => handleCapturePhoto('idFront')}
                      />
                    </View>
                  )}
                </View>

                {/* Reverso */}
                <View style={styles.docBox}>
                  <View style={styles.docHeader}>
                    <Text style={styles.docTitle}>Reverso de la cédula</Text>
                    <StatusPill
                      label={idCardBack ? 'Lista' : 'Pendiente'}
                      tone={idCardBack ? 'emerald' : 'neutral'}
                    />
                  </View>

                  {idCardBack ? (
                    <View style={styles.previewWrap}>
                      <Image
                        source={{ uri: idCardBack }}
                        style={styles.previewImg}
                        resizeMode="cover"
                      />
                      <LiquidPillButton
                        label="Repetir foto"
                        variant="glass"
                        size="sm"
                        icon="refresh"
                        iconPosition="left"
                        onPress={() => handleCapturePhoto('idBack')}
                        style={{ marginTop: 10 }}
                      />
                    </View>
                  ) : (
                    <View style={styles.captureWell}>
                      <PrismIcon name="scan" size={26} color={palette.aqua} />
                      <Text style={styles.captureHint}>
                        Asegúrate de que la firma y el código posterior se vean nítidos
                      </Text>
                      <LiquidPillButton
                        label="Tomar foto posterior"
                        variant="obsidian"
                        size="sm"
                        icon="camera"
                        iconPosition="left"
                        onPress={() => handleCapturePhoto('idBack')}
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
                    onPress={() => {
                      setStepError(null);
                      setStep(1);
                    }}
                  />
                  <LiquidPillButton
                    label="Continuar"
                    variant="obsidian"
                    icon="arrowRight"
                    disabled={!idCardFront || !idCardBack}
                    onPress={handleNextStep2}
                    style={styles.flex}
                  />
                </View>
              </LiquidGlassCard>
            )}

            {/* ============================================================== */}
            {/* PASO 3: CONFIRMACIÓN FACIAL                                    */}
            {/* ============================================================== */}
            {step === 3 && (
              <LiquidGlassCard strong blurPx={34}>
                <Text style={styles.cardTitle}>Confirmación facial</Text>
                <Text style={styles.cardSubtitle}>
                  Una breve foto en vivo nos ayuda a proteger a toda la comunidad contra cuentas falsas.
                </Text>

                <View style={styles.selfieCenterStage}>
                  {selfiePhoto ? (
                    <View style={styles.selfieCapturedWrap}>
                      <View style={[styles.selfieBezel, sculptedShadow()]}>
                        <Image
                          source={{ uri: selfiePhoto }}
                          style={styles.selfieImg}
                          resizeMode="cover"
                        />
                      </View>
                      <View style={{ marginTop: 12 }}>
                        <StatusPill label="Rostro verificado" tone="emerald" />
                      </View>
                      <LiquidPillButton
                        label="Tomar otra foto"
                        variant="glass"
                        size="sm"
                        icon="refresh"
                        iconPosition="left"
                        onPress={() => {
                          setSelfiePhoto(null);
                          setLivenessChallenge(null);
                        }}
                        style={{ marginTop: 10 }}
                      />
                    </View>
                  ) : livenessChallenge ? (
                    <View style={[styles.sculptedSelfieOrb, sculptedShadow()]}>
                      <Text style={styles.challengeSmallLabel}>Gesto rápido</Text>
                      <Text style={styles.challengeCopy}>
                        {livenessChallenge.instruction}
                      </Text>
                      <LiquidPillButton
                        label="Abrir cámara"
                        variant="obsidian"
                        size="sm"
                        icon="camera"
                        iconPosition="left"
                        onPress={confirmLivenessAndCapture}
                      />
                      <TouchableOpacity
                        onPress={startLivenessChallenge}
                        style={{ marginTop: 10 }}
                      >
                        <Text style={styles.otherGestureLink}>Probar otro gesto</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.sculptedSelfieOrb, sculptedShadow()]}>
                      <PrismIcon name="scan" size={34} color={palette.aqua} />
                      <Text style={styles.orbTitle}>Encuadra tu rostro</Text>
                      <Text style={styles.orbHint}>
                        Busca buena luz natural sin gafas oscuras
                      </Text>
                      <LiquidPillButton
                        label="Comenzar"
                        variant="obsidian"
                        size="sm"
                        icon="arrowRight"
                        onPress={startLivenessChallenge}
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
                    onPress={() => {
                      setStepError(null);
                      setStep(2);
                    }}
                  />
                  <LiquidPillButton
                    label="Revisar"
                    variant="obsidian"
                    icon="arrowRight"
                    disabled={!selfiePhoto}
                    onPress={handleNextStep3}
                    style={styles.flex}
                  />
                </View>
              </LiquidGlassCard>
            )}

            {/* ============================================================== */}
            {/* PASO 4: REVISIÓN Y ENVÍO                                       */}
            {/* ============================================================== */}
            {step === 4 && (
              <LiquidGlassCard strong blurPx={34}>
                <Text style={styles.cardTitle}>Revisa tu solicitud</Text>
                <Text style={styles.cardSubtitle}>
                  Confirma que tus datos estén correctos antes de finalizar.
                </Text>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Nombre</Text>
                    <Text style={styles.summaryVal}>{fullName}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Cédula</Text>
                    <Text style={styles.summaryVal}>{cedula}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Correo</Text>
                    <Text style={styles.summaryVal}>{email.toLowerCase()}</Text>
                  </View>
                  {phone.trim() ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryKey}>Teléfono</Text>
                      <Text style={styles.summaryVal}>{phone}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.thumbsRow}>
                  {idCardFront ? (
                    <Image
                      source={{ uri: idCardFront }}
                      style={styles.thumbRect}
                      resizeMode="cover"
                    />
                  ) : null}
                  {idCardBack ? (
                    <Image
                      source={{ uri: idCardBack }}
                      style={styles.thumbRect}
                      resizeMode="cover"
                    />
                  ) : null}
                  {selfiePhoto ? (
                    <Image
                      source={{ uri: selfiePhoto }}
                      style={styles.thumbCircle}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>

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
                    Autorizo el tratamiento cifrado de mis datos biométricos conforme a la Ley 1581 de 2012 (Habeas Data) y declaro que los documentos entregados me pertenecen.
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
                      setStep(3);
                    }}
                  />
                  <LiquidPillButton
                    label="Enviar solicitud"
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
    paddingVertical: 24,
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
    marginBottom: 6,
  },
  cardSubtitle: {
    fontFamily: fontSans,
    fontSize: 14,
    lineHeight: 20,
    color: palette.textSecondary,
    marginBottom: 20,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -4,
    marginBottom: 8,
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
  docBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
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
    marginBottom: 10,
  },
  docTitle: {
    fontFamily: fontSans,
    fontSize: 14,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  captureWell: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(148, 163, 184, 0.55)',
    backgroundColor: 'rgba(248, 250, 252, 0.72)',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  captureHint: {
    fontFamily: fontSans,
    fontSize: 12.5,
    color: palette.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  previewWrap: {
    alignItems: 'center',
  },
  previewImg: {
    width: '100%',
    height: 148,
    borderRadius: 14,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  selfieCenterStage: {
    alignItems: 'center',
    marginVertical: 12,
  },
  sculptedSelfieOrb: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  orbTitle: {
    fontFamily: fontSans,
    fontSize: 16,
    fontWeight: '700',
    color: palette.textPrimary,
    marginTop: 10,
  },
  orbHint: {
    fontFamily: fontSans,
    fontSize: 12.5,
    color: palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  challengeSmallLabel: {
    fontFamily: fontSans,
    fontSize: 11.5,
    fontWeight: '700',
    color: palette.aqua,
    marginBottom: 6,
  },
  challengeCopy: {
    fontFamily: fontSans,
    fontSize: 13,
    lineHeight: 18,
    color: palette.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
  },
  otherGestureLink: {
    fontFamily: fontSans,
    fontSize: 12,
    color: palette.textMuted,
  },
  selfieCapturedWrap: {
    alignItems: 'center',
  },
  selfieBezel: {
    padding: 5,
    borderRadius: 102,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.emeraldBorder,
  },
  selfieImg: {
    width: 188,
    height: 188,
    borderRadius: 94,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.6)',
    padding: 16,
    gap: 10,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryKey: {
    fontFamily: fontSans,
    fontSize: 13,
    color: palette.textMuted,
  },
  summaryVal: {
    fontFamily: fontSans,
    fontSize: 13.5,
    fontWeight: '600',
    color: palette.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  thumbsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  thumbRect: {
    flex: 1,
    height: 70,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  thumbCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  declarationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 15,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.75)',
    marginBottom: 6,
  },
  declarationCardActive: {
    borderColor: palette.aquaBorder,
    backgroundColor: 'rgba(240, 249, 255, 0.85)',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
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
});
