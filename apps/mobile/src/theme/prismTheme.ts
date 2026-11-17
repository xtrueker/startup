import { Platform, ViewStyle, TextStyle } from 'react-native';

export const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * SCULPTURAL PEARL & LIQUID GLASS DESIGN SYSTEM
 * Luminous alabaster-silver studio surfaces, real 3D sculptural depth,
 * translucent frosted liquid glass with double-bevel specular rims,
 * organic fluid curves, and crisp jet-black capsule actions.
 */
export const palette = {
  // Luminous Studio Canvas
  canvas: '#F2F5F9',
  canvasWarm: '#F7F6F3',
  surfacePure: '#FFFFFF',
  surfaceSoft: '#EEF2F7',
  surfaceMuted: '#E4EAF1',

  // Multi-Layer Liquid Glass (Bright Frosted Studio Glass)
  glassFill: 'rgba(255, 255, 255, 0.66)',
  glassFillStrong: 'rgba(255, 255, 255, 0.80)',
  glassFillSubtle: 'rgba(255, 255, 255, 0.48)',
  glassRecessed: 'rgba(241, 245, 250, 0.78)',
  glassInput: 'rgba(255, 255, 255, 0.82)',
  glassInputFocused: '#FFFFFF',

  // Specular & Chrome Borders (3D Bevel Simulation)
  borderSpecularWhite: 'rgba(255, 255, 255, 0.95)',
  borderGlassRim: 'rgba(255, 255, 255, 0.78)',
  borderChrome: 'rgba(148, 163, 184, 0.26)',
  borderSubtle: 'rgba(15, 23, 42, 0.07)',
  borderHairline: 'rgba(15, 23, 42, 0.05)',
  gridLine: 'rgba(15, 23, 42, 0.035)',

  // High-Contrast Obsidian Ink & Capsules (Ref 2 Signature)
  obsidianPill: '#0C0F14',
  obsidianHover: '#181E29',
  textOnObsidian: '#FFFFFF',

  // Liquid Aqua & Iridescent Accents (Ref 0 & Ref 1)
  aqua: '#0EA5E9',
  aquaSoft: '#38BDF8',
  aquaMint: '#14B8A6',
  aquaTint: 'rgba(14, 165, 233, 0.12)',
  aquaBorder: 'rgba(14, 165, 233, 0.38)',
  aquaGlow: 'rgba(56, 189, 248, 0.26)',

  // Semantic States (Softened, Sculptural, Non-Neon)
  emerald: '#0D9488',
  emeraldBright: '#10B981',
  emeraldTint: 'rgba(16, 185, 129, 0.11)',
  emeraldBorder: 'rgba(16, 185, 129, 0.28)',

  amber: '#D97706',
  amberTint: 'rgba(217, 119, 6, 0.10)',
  amberBorder: 'rgba(217, 119, 6, 0.26)',

  crimson: '#E11D48',
  crimsonDeep: '#BE123C',
  crimsonSoft: '#FB7185',
  crimsonTint: 'rgba(225, 29, 72, 0.09)',
  crimsonBorder: 'rgba(225, 29, 72, 0.28)',

  // Editorial Human Typography
  textPrimary: '#0F141C',
  textSecondary: '#4B5565',
  textMuted: '#7B8798',
  textFaint: '#9AA5B4',
} as const;

export const fontSans = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Plus Jakarta Sans", Inter, "Segoe UI", sans-serif',
});

export const fontMono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
});

/**
 * Tactile 3D Frosted Liquid Glass card with pure-white top specular bevel
 * and soft diffused studio ambient shadow.
 */
export function glassSurfaceStyle(blurPx = 28, strong = false): ViewStyle {
  const base: ViewStyle = {
    backgroundColor: strong ? palette.glassFillStrong : palette.glassFill,
    borderWidth: 1,
    borderColor: palette.borderGlassRim,
  };

  if (Platform.OS === 'web') {
    return {
      ...base,
      ...({
        backdropFilter: `blur(${blurPx}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${blurPx}px) saturate(180%)`,
        boxShadow:
          '0 28px 60px -15px rgba(15, 23, 42, 0.11), 0 8px 20px -6px rgba(15, 23, 42, 0.05), inset 0 1.5px 0 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 0 rgba(148, 163, 184, 0.18)',
      } as unknown as ViewStyle),
    };
  }

  return {
    ...base,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 26,
    elevation: 8,
  };
}

/**
 * Sculpted 3D pill / medallion elevation (like Searchralism's liquid-chrome rim + studio shadow).
 */
export function sculptedShadow(
  color = 'rgba(15, 23, 42, 0.18)',
  radius = 24,
  opacity = 0.18,
  offsetY = 10
): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0 ${offsetY}px ${radius}px -6px ${color}, 0 2px 6px -1px rgba(15, 23, 42, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.35)`,
    } as unknown as ViewStyle;
  }

  return {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: 7,
  };
}

/**
 * Recessed / sculpted 3D liquid-glass input track (inspired by Searchralism).
 */
export function sculptedInputStyle(focused = false): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      backgroundColor: focused ? '#FFFFFF' : palette.glassInput,
      borderWidth: 1,
      borderColor: focused ? palette.aquaBorder : 'rgba(203, 213, 225, 0.72)',
      ...({
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: focused
          ? '0 10px 26px -6px rgba(14, 165, 233, 0.22), 0 0 0 3px rgba(56, 189, 248, 0.14), inset 0 1px 0 0 #FFFFFF'
          : '0 4px 12px -2px rgba(15, 23, 42, 0.04), inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.9), inset 0 -1px 0 0 rgba(148, 163, 184, 0.15)',
      } as unknown as ViewStyle),
    };
  }

  return {
    backgroundColor: focused ? '#FFFFFF' : palette.glassInput,
    borderWidth: 1,
    borderColor: focused ? palette.aquaBorder : 'rgba(203, 213, 225, 0.75)',
  };
}

export const typography = {
  heroTitle: {
    fontFamily: fontSans,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.9,
    color: palette.textPrimary,
  } as TextStyle,
  sectionTitle: {
    fontFamily: fontSans,
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: palette.textPrimary,
  } as TextStyle,
  body: {
    fontFamily: fontSans,
    fontSize: 14.5,
    lineHeight: 21,
    color: palette.textSecondary,
  } as TextStyle,
};
