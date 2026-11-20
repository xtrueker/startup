import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { config } from '../config';
import { authService } from '../services/auth';
import { showAlert } from '../utils/dialogs';
import { palette, fontSans, glassSurfaceStyle } from '../theme/prismTheme';
import {
  AmbientPrismCanvas,
  LiquidGlassCard,
  LiquidInput,
  LiquidPillButton,
  PrismEmblem,
  PrismIcon,
  StatusPill,
} from '../components/ui/PrismPrimitives';

interface LoginScreenProps {
  onLogin: () => void;
  onGoRegister: () => void;
}

export default function LoginScreen({ onLogin, onGoRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const notifyError = (title: string, message: string) => {
    setErrorMsg(message);
    showAlert(title, message, { showOnWeb: false });
  };

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password) {
      notifyError('Campos pendientes', 'Ingresa tu correo electrónico y contraseña para continuar.');
      return;
    }

    setLoading(true);
    try {
      await authService.login({ email: email.trim().toLowerCase(), password });
      onLogin();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Credenciales inválidas o servicio temporalmente no disponible.';
      notifyError('No pudimos iniciar sesión', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setErrorMsg(null);
    setEmail(config.DEMO_ACCOUNT.email);
    setPassword(config.DEMO_ACCOUNT.password);
  };

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
            {/* Top Sculpted Studio Bar (Inspired by Reference 2) */}
            <View style={[styles.topNavBar, glassSurfaceStyle(24, true)]}>
              <View style={styles.brandRow}>
                <PrismEmblem size={36} />
                <Text style={styles.brandName}>Red Ciudadana</Text>
              </View>

              <View style={styles.topNavRight}>
                {config.DEMO_ACCOUNT.enabled ? (
                  <TouchableOpacity
                    onPress={handleFillDemo}
                    activeOpacity={0.75}
                    style={styles.demoCapsule}
                  >
                    <Text style={styles.demoCapsuleText}>Cuenta demo</Text>
                  </TouchableOpacity>
                ) : null}
                <StatusPill label="Conectado" tone="emerald" />
              </View>
            </View>

            {/* Center Floating Frosted Liquid Glass Card */}
            <LiquidGlassCard style={styles.mainCard} strong blurPx={34}>
              <View style={styles.heroBlock}>
                <Text style={styles.heroTitle}>Bienvenido de nuevo</Text>
                <Text style={styles.heroSubtitle}>
                  Acompañamiento comunitario y atención inmediata, diseñados para cuidarte con calma y claridad.
                </Text>
              </View>

              {errorMsg ? (
                <View style={styles.errorBanner}>
                  <PrismIcon name="alert" size={17} color={palette.crimson} />
                  <Text style={styles.errorBannerText}>{errorMsg}</Text>
                </View>
              ) : null}

              <LiquidInput
                label="Correo electrónico"
                icon="mail"
                placeholder="nombre@correo.com"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errorMsg) setErrorMsg(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <LiquidInput
                label="Contraseña"
                icon="lock"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errorMsg) setErrorMsg(null);
                }}
                secureTextEntry={!showPassword}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eyeBtn}
                  >
                    <PrismIcon
                      name={showPassword ? 'eyeOff' : 'eye'}
                      size={17}
                      color={palette.textSecondary}
                    />
                  </TouchableOpacity>
                }
              />

              {/* Signature Solid Jet-Black Capsule Button (Reference 2) */}
              <LiquidPillButton
                label="Iniciar sesión"
                variant="obsidian"
                size="lg"
                icon="arrowRight"
                loading={loading}
                onPress={handleLogin}
                style={styles.submitBtn}
              />

              <View style={styles.footerRow}>
                <Text style={styles.footerPrompt}>¿Primera vez en la red?</Text>
                <LiquidPillButton
                  label="Crear cuenta"
                  variant="glass"
                  size="sm"
                  icon="arrowRight"
                  onPress={onGoRegister}
                />
              </View>
            </LiquidGlassCard>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 26,
  },
  shell: {
    width: '100%',
    maxWidth: 470,
    alignSelf: 'center',
    gap: 20,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandName: {
    fontFamily: fontSans,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: palette.textPrimary,
  },
  topNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoCapsule: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  demoCapsuleText: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  mainCard: {
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  heroBlock: {
    alignItems: 'center',
    marginBottom: 26,
  },
  heroTitle: {
    fontFamily: fontSans,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: palette.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: fontSans,
    fontSize: 14.5,
    lineHeight: 21,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 340,
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
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fontSans,
    fontSize: 13,
    lineHeight: 18,
    color: palette.crimsonDeep,
  },
  eyeBtn: {
    padding: 2,
  },
  submitBtn: {
    marginTop: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: palette.borderSubtle,
  },
  footerPrompt: {
    fontFamily: fontSans,
    fontSize: 13.5,
    color: palette.textSecondary,
  },
});
