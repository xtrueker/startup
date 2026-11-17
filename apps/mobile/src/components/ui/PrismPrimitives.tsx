import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Image,
  ViewStyle,
  TextStyle,
  TextInputProps,
  ActivityIndicator,
} from 'react-native';
import sculpturalPearlBg from '../../../assets/sculptural-pearl-bg.jpg';
import {
  palette,
  fontSans,
  glassSurfaceStyle,
  sculptedShadow,
  sculptedInputStyle,
  USE_NATIVE_DRIVER,
} from '../../theme/prismTheme';

// ============================================================================
// 1. AMBIENT SCULPTURAL PEARL & LIQUID GLASS CANVAS
// ============================================================================
interface AmbientPrismCanvasProps {
  intensity?: 'subtle' | 'normal' | 'vivid';
  accentTone?: 'aqua' | 'crimson' | 'emerald';
}

export function AmbientPrismCanvas({
  intensity = 'normal',
}: AmbientPrismCanvasProps) {
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 11000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 11000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const scale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [1.01, 1.05],
  });

  const veilOpacity =
    intensity === 'subtle' ? 0.34 : intensity === 'vivid' ? 0.08 : 0.16;

  const gridCols = [20, 40, 60, 80];
  const gridRows = [22, 46, 70];

  return (
    <View style={[StyleSheet.absoluteFill, styles.canvasRoot]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ scale }] },
        ]}
      >
        <Image
          source={sculpturalPearlBg}
          style={styles.bgImage}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Soft translucent pearl atmospheric veil for effortless card legibility */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: `rgba(246, 248, 251, ${veilOpacity})` },
        ]}
      />

      {/* Delicate architectural studio grid (Reference 2: Elevate Your Enterprise) */}
      {gridCols.map((pct) => (
        <View
          key={`vc-${pct}`}
          style={[styles.gridLineV, { left: `${pct}%` as any }]}
        />
      ))}
      {gridRows.map((pct) => (
        <View
          key={`hr-${pct}`}
          style={[styles.gridLineH, { top: `${pct}%` as any }]}
        />
      ))}
    </View>
  );
}

// ============================================================================
// 2. SCULPTED CERAMIC & LIQUID-AQUA BRAND MEDALLION
// ============================================================================
export function PrismEmblem({
  size = 42,
  activeAlert = false,
}: {
  size?: number;
  activeAlert?: boolean;
}) {
  const accent = activeAlert ? palette.crimson : palette.aqua;
  const innerSize = Math.round(size * 0.44);
  const dropletSize = Math.round(size * 0.16);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.34),
          backgroundColor: '#FFFFFF',
          borderWidth: 1.2,
          borderColor: activeAlert
            ? 'rgba(225, 29, 72, 0.32)'
            : 'rgba(203, 213, 225, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        sculptedShadow(
          activeAlert ? 'rgba(225, 29, 72, 0.24)' : 'rgba(14, 165, 233, 0.20)',
          18,
          0.14,
          6
        ),
      ]}
    >
      {/* Inner liquid-glass diamond lens */}
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: Math.round(innerSize * 0.28),
          backgroundColor: activeAlert
            ? 'rgba(225, 29, 72, 0.10)'
            : 'rgba(14, 165, 233, 0.12)',
          borderWidth: 1.5,
          borderColor: accent,
          transform: [{ rotate: '45deg' }],
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: dropletSize,
            height: dropletSize,
            borderRadius: dropletSize / 2,
            backgroundColor: accent,
          }}
        />
      </View>
    </View>
  );
}

// ============================================================================
// 3. CLEAN GEOMETRIC ICONS (Refined Stroke Proportions on Light Pearl Surfaces)
// ============================================================================
export type PrismIconName =
  | 'shield'
  | 'lock'
  | 'mail'
  | 'user'
  | 'phone'
  | 'idCard'
  | 'camera'
  | 'scan'
  | 'crosshair'
  | 'radar'
  | 'check'
  | 'arrowRight'
  | 'arrowLeft'
  | 'eye'
  | 'eyeOff'
  | 'alert'
  | 'waves'
  | 'navigation'
  | 'logout'
  | 'refresh'
  | 'beacon';

export function PrismIcon({
  name,
  size = 18,
  color = palette.textPrimary,
}: {
  name: PrismIconName;
  size?: number;
  color?: string;
}) {
  const s = size;
  const stroke = Math.max(1.5, Math.round(s * 0.095 * 10) / 10);

  switch (name) {
    case 'mail':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.86,
              height: s * 0.64,
              borderRadius: 3.5,
              borderWidth: stroke,
              borderColor: color,
              overflow: 'hidden',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.62,
                height: s * 0.62,
                borderBottomWidth: stroke,
                borderRightWidth: stroke,
                borderColor: color,
                transform: [{ translateY: -s * 0.34 }, { rotate: '45deg' }],
              }}
            />
          </View>
        </View>
      );

    case 'lock':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.44,
              height: s * 0.34,
              borderTopLeftRadius: s * 0.22,
              borderTopRightRadius: s * 0.22,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: color,
              marginBottom: -1,
            }}
          />
          <View
            style={{
              width: s * 0.72,
              height: s * 0.5,
              borderRadius: 4,
              borderWidth: stroke,
              borderColor: color,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: stroke * 1.4,
                height: s * 0.16,
                borderRadius: stroke,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'user':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.36,
              height: s * 0.36,
              borderRadius: s * 0.18,
              borderWidth: stroke,
              borderColor: color,
              marginBottom: s * 0.07,
            }}
          />
          <View
            style={{
              width: s * 0.72,
              height: s * 0.32,
              borderTopLeftRadius: s * 0.36,
              borderTopRightRadius: s * 0.36,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'phone':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.54,
              height: s * 0.84,
              borderRadius: 4,
              borderWidth: stroke,
              borderColor: color,
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingBottom: s * 0.1,
            }}
          >
            <View
              style={{
                width: s * 0.18,
                height: stroke,
                borderRadius: stroke,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'idCard':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.88,
              height: s * 0.64,
              borderRadius: 4,
              borderWidth: stroke,
              borderColor: color,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: s * 0.12,
              gap: s * 0.1,
            }}
          >
            <View
              style={{
                width: s * 0.2,
                height: s * 0.24,
                borderRadius: 2,
                borderWidth: stroke,
                borderColor: color,
              }}
            />
            <View style={{ flex: 1, gap: s * 0.09 }}>
              <View style={{ height: stroke, backgroundColor: color, borderRadius: 1 }} />
              <View
                style={{
                  width: '68%',
                  height: stroke,
                  backgroundColor: color,
                  opacity: 0.65,
                  borderRadius: 1,
                }}
              />
            </View>
          </View>
        </View>
      );

    case 'camera':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.32,
              height: s * 0.12,
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: color,
              marginBottom: -1,
            }}
          />
          <View
            style={{
              width: s * 0.86,
              height: s * 0.62,
              borderRadius: 4,
              borderWidth: stroke,
              borderColor: color,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.3,
                height: s * 0.3,
                borderRadius: s * 0.15,
                borderWidth: stroke,
                borderColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'scan':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              position: 'absolute',
              top: s * 0.1,
              left: s * 0.1,
              width: s * 0.24,
              height: s * 0.24,
              borderTopWidth: stroke,
              borderLeftWidth: stroke,
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: s * 0.1,
              right: s * 0.1,
              width: s * 0.24,
              height: s * 0.24,
              borderTopWidth: stroke,
              borderRightWidth: stroke,
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: s * 0.1,
              left: s * 0.1,
              width: s * 0.24,
              height: s * 0.24,
              borderBottomWidth: stroke,
              borderLeftWidth: stroke,
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: s * 0.1,
              right: s * 0.1,
              width: s * 0.24,
              height: s * 0.24,
              borderBottomWidth: stroke,
              borderRightWidth: stroke,
              borderColor: color,
            }}
          />
          <View
            style={{
              width: s * 0.32,
              height: s * 0.32,
              borderRadius: s * 0.16,
              borderWidth: stroke,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'crosshair':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.68,
              height: s * 0.68,
              borderRadius: s * 0.34,
              borderWidth: stroke,
              borderColor: color,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: stroke * 1.7,
                height: stroke * 1.7,
                borderRadius: stroke,
                backgroundColor: color,
              }}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              top: s * 0.04,
              width: stroke,
              height: s * 0.18,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: s * 0.04,
              width: stroke,
              height: s * 0.18,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: s * 0.04,
              height: stroke,
              width: s * 0.18,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.04,
              height: stroke,
              width: s * 0.18,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'radar':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.84,
              height: s * 0.84,
              borderRadius: s * 0.42,
              borderWidth: stroke,
              borderColor: color,
              opacity: 0.38,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.52,
              height: s * 0.52,
              borderRadius: s * 0.26,
              borderWidth: stroke,
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.2,
              height: s * 0.2,
              borderRadius: s * 0.1,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'check':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.56,
              height: s * 0.3,
              borderLeftWidth: stroke * 1.3,
              borderBottomWidth: stroke * 1.3,
              borderColor: color,
              transform: [{ translateY: -s * 0.05 }, { rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'arrowRight':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.62,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.18,
              width: s * 0.3,
              height: s * 0.3,
              borderTopWidth: stroke,
              borderRightWidth: stroke,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'arrowLeft':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.62,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: s * 0.18,
              width: s * 0.3,
              height: s * 0.3,
              borderBottomWidth: stroke,
              borderLeftWidth: stroke,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'eye':
    case 'eyeOff':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.84,
              height: s * 0.48,
              borderRadius: s * 0.28,
              borderWidth: stroke,
              borderColor: color,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.22,
                height: s * 0.22,
                borderRadius: s * 0.11,
                backgroundColor: color,
              }}
            />
          </View>
          {name === 'eyeOff' && (
            <View
              style={{
                position: 'absolute',
                width: s * 0.9,
                height: stroke,
                backgroundColor: color,
                transform: [{ rotate: '-38deg' }],
              }}
            />
          )}
        </View>
      );

    case 'alert':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.82,
              height: s * 0.82,
              borderRadius: s * 0.41,
              borderWidth: stroke,
              borderColor: color,
              justifyContent: 'center',
              alignItems: 'center',
              gap: s * 0.08,
            }}
          >
            <View
              style={{
                width: stroke,
                height: s * 0.26,
                borderRadius: stroke,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                width: stroke * 1.2,
                height: stroke * 1.2,
                borderRadius: stroke,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'waves':
      return (
        <View
          style={{
            width: s,
            height: s,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: s * 0.1,
          }}
        >
          {[0.34, 0.72, 0.5, 0.84, 0.4].map((ratio, idx) => (
            <View
              key={idx}
              style={{
                width: stroke * 1.15,
                height: s * ratio,
                borderRadius: stroke,
                backgroundColor: color,
              }}
            />
          ))}
        </View>
      );

    case 'navigation':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.54,
              height: s * 0.54,
              borderTopWidth: stroke * 1.3,
              borderRightWidth: stroke * 1.3,
              borderColor: color,
              transform: [{ rotate: '15deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.62,
              height: stroke * 1.2,
              backgroundColor: color,
              transform: [{ rotate: '-38deg' }],
            }}
          />
        </View>
      );

    case 'logout':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              position: 'absolute',
              left: s * 0.12,
              width: s * 0.42,
              height: s * 0.74,
              borderTopLeftRadius: 3,
              borderBottomLeftRadius: 3,
              borderWidth: stroke,
              borderRightWidth: 0,
              borderColor: color,
            }}
          />
          <View
            style={{
              width: s * 0.48,
              height: stroke,
              backgroundColor: color,
              transform: [{ translateX: s * 0.12 }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.12,
              width: s * 0.24,
              height: s * 0.24,
              borderTopWidth: stroke,
              borderRightWidth: stroke,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'refresh':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.72,
              height: s * 0.72,
              borderRadius: s * 0.36,
              borderWidth: stroke,
              borderRightColor: 'transparent',
              borderColor: color,
              transform: [{ rotate: '-25deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: s * 0.14,
              right: s * 0.16,
              width: s * 0.22,
              height: s * 0.22,
              borderTopWidth: stroke,
              borderRightWidth: stroke,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'beacon':
    case 'shield':
    default:
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: s * 0.62,
              height: s * 0.62,
              borderRadius: 3.5,
              borderWidth: stroke,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.22,
                height: s * 0.22,
                borderRadius: s * 0.11,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );
  }
}

// ============================================================================
// 4. TACTILE FROSTED LIQUID GLASS CARD (3D Specular Bevel + Soft Studio Shadow)
// ============================================================================
interface LiquidGlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | (ViewStyle | false | null | undefined)[];
  accentColor?: string;
  strong?: boolean;
  blurPx?: number;
}

export function LiquidGlassCard({
  children,
  style,
  accentColor,
  strong = false,
  blurPx = 30,
}: LiquidGlassCardProps) {
  return (
    <View
      style={[
        styles.glassCard,
        glassSurfaceStyle(blurPx, strong),
        accentColor ? { borderColor: accentColor } : null,
        ...(Array.isArray(style) ? style : [style]),
      ]}
    >
      {/* Pure-white top specular glass highlight */}
      <View style={styles.specularWhiteRim} />
      {children}
    </View>
  );
}

// ============================================================================
// 5. SCULPTED PILL BUTTON (Jet-Black Obsidian Primary + Frosted Glass + Aqua)
// ============================================================================
interface LiquidPillButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'obsidian' | 'aqua' | 'glass' | 'crimson';
  icon?: PrismIconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle | (ViewStyle | false | null | undefined)[];
}

export function LiquidPillButton({
  label,
  onPress,
  variant = 'obsidian',
  icon,
  iconPosition = 'right',
  loading = false,
  disabled = false,
  size = 'md',
  style,
}: LiquidPillButtonProps) {
  const heightMap = { sm: 38, md: 48, lg: 54 };
  const padMap = { sm: 16, md: 22, lg: 28 };
  const fontMap = { sm: 12.5, md: 14.5, lg: 15.5 };

  const variantContainer: Record<string, ViewStyle> = {
    obsidian: {
      backgroundColor: palette.obsidianPill,
      borderWidth: 1,
      borderColor: '#1E2430',
      ...sculptedShadow('rgba(12, 15, 20, 0.28)', 24, 0.24, 10),
    },
    aqua: {
      backgroundColor: 'rgba(14, 165, 233, 0.13)',
      borderWidth: 1.2,
      borderColor: palette.aquaBorder,
      ...sculptedShadow('rgba(14, 165, 233, 0.22)', 20, 0.18, 8),
    },
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.82)',
      borderWidth: 1,
      borderColor: 'rgba(203, 213, 225, 0.85)',
      ...sculptedShadow('rgba(15, 23, 42, 0.08)', 16, 0.08, 5),
    },
    crimson: {
      backgroundColor: palette.crimson,
      borderWidth: 1,
      borderColor: '#FB7185',
      ...sculptedShadow('rgba(225, 29, 72, 0.32)', 22, 0.25, 8),
    },
  };

  const textColors: Record<string, string> = {
    obsidian: palette.textOnObsidian,
    aqua: '#0369A1',
    glass: palette.textPrimary,
    crimson: '#FFFFFF',
  };

  const textColor = textColors[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        {
          minHeight: heightMap[size],
          paddingHorizontal: padMap[size],
          borderRadius: 999,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        variantContainer[variant],
        disabled ? { opacity: 0.4 } : null,
        ...(Array.isArray(style) ? style : [style]),
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' ? (
            <PrismIcon name={icon} size={size === 'sm' ? 14 : 16} color={textColor} />
          ) : null}
          <Text
            style={{
              fontFamily: fontSans,
              color: textColor,
              fontSize: fontMap[size],
              fontWeight: '600',
              letterSpacing: -0.1,
            }}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' ? (
            <PrismIcon name={icon} size={size === 'sm' ? 14 : 16} color={textColor} />
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// 6. 3D CHROME-BEZEL LIQUID GLASS PILL INPUT (Inspired by Searchralism)
// ============================================================================
interface LiquidInputProps extends TextInputProps {
  label: string;
  icon?: PrismIconName;
  rightElement?: React.ReactNode;
  hint?: string;
}

export function LiquidInput({
  label,
  icon,
  rightElement,
  hint,
  style,
  onFocus,
  onBlur,
  ...rest
}: LiquidInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 15 }}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {hint ? <Text style={styles.inputHint}>{hint}</Text> : null}
      </View>

      {/* Outer brushed metallic-glass bezel */}
      <View
        style={[
          styles.inputOuterBezel,
          focused && styles.inputOuterBezelFocused,
        ]}
      >
        <View style={[styles.inputInnerChamber, sculptedInputStyle(focused)]}>
          {icon ? (
            <View style={styles.inputIconWrap}>
              <PrismIcon
                name={icon}
                size={16}
                color={focused ? palette.aqua : palette.textMuted}
              />
            </View>
          ) : null}

          <TextInput
            placeholderTextColor={palette.textFaint}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[
              styles.inputField,
              Platform.OS === 'web'
                ? ({ outlineStyle: 'none' } as unknown as TextStyle)
                : null,
              style as TextStyle,
            ]}
            {...rest}
          />

          {rightElement ? (
            <View style={styles.inputRightSlot}>
              <View style={styles.inputRightDivider} />
              {rightElement}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// 7. FLUID SIGNAL BARS (Soft Sculpted Signal Indicator)
// ============================================================================
interface TelemetryEqualizerProps {
  color?: string;
  active?: boolean;
  heights?: number[];
}

export function TelemetryEqualizer({
  color = palette.aqua,
  active = true,
  heights = [0.42, 0.85, 0.62, 1.0, 0.56],
}: TelemetryEqualizerProps) {
  const pulse = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulse, {
          toValue: 0.68,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 20,
        gap: 3.5,
        opacity: active ? pulse : 0.35,
      }}
    >
      {heights.map((ratio, idx) => (
        <View
          key={idx}
          style={{
            width: 3.5,
            height: Math.max(5, Math.round(20 * ratio)),
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      ))}
    </Animated.View>
  );
}

// ============================================================================
// 8. CLEAN HUMAN STATUS PILL
// ============================================================================
export function StatusPill({
  label,
  tone = 'aqua',
}: {
  label: string;
  tone?: 'aqua' | 'emerald' | 'amber' | 'crimson' | 'neutral';
  pulsing?: boolean;
}) {
  const toneColors = {
    aqua: {
      dot: palette.aqua,
      border: 'rgba(14, 165, 233, 0.25)',
      bg: 'rgba(255, 255, 255, 0.78)',
      text: '#0369A1',
    },
    emerald: {
      dot: palette.emeraldBright,
      border: palette.emeraldBorder,
      bg: 'rgba(255, 255, 255, 0.82)',
      text: '#0F766E',
    },
    amber: {
      dot: palette.amber,
      border: palette.amberBorder,
      bg: 'rgba(255, 255, 255, 0.82)',
      text: '#B45309',
    },
    crimson: {
      dot: palette.crimson,
      border: palette.crimsonBorder,
      bg: 'rgba(255, 241, 242, 0.92)',
      text: palette.crimsonDeep,
    },
    neutral: {
      dot: palette.textMuted,
      border: 'rgba(203, 213, 225, 0.7)',
      bg: 'rgba(255, 255, 255, 0.72)',
      text: palette.textSecondary,
    },
  }[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: toneColors.border,
        backgroundColor: toneColors.bg,
        gap: 6,
      }}
    >
      <View
        style={{
          width: 6.5,
          height: 6.5,
          borderRadius: 3.5,
          backgroundColor: toneColors.dot,
        }}
      />
      <Text
        style={{
          fontFamily: fontSans,
          fontSize: 11.5,
          fontWeight: '600',
          color: toneColors.text,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasRoot: {
    backgroundColor: palette.canvas,
    overflow: 'hidden',
    pointerEvents: 'none',
  } as ViewStyle,
  bgImage: {
    width: '100%',
    height: '100%',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: palette.gridLine,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: palette.gridLine,
  },
  glassCard: {
    borderRadius: 30,
    padding: 26,
    overflow: 'hidden',
    position: 'relative',
  },
  specularWhiteRim: {
    position: 'absolute',
    top: 0,
    left: '8%',
    right: '8%',
    height: 1.5,
    backgroundColor: palette.borderSpecularWhite,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
    paddingHorizontal: 4,
  },
  inputLabel: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: '600',
    color: palette.textPrimary,
    letterSpacing: -0.1,
  },
  inputHint: {
    fontFamily: fontSans,
    fontSize: 11.5,
    color: palette.textMuted,
  },
  inputOuterBezel: {
    padding: 2.5,
    borderRadius: 999,
    backgroundColor: 'rgba(226, 232, 240, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  inputOuterBezelFocused: {
    backgroundColor: 'rgba(186, 230, 253, 0.45)',
    borderColor: 'rgba(56, 189, 248, 0.45)',
  },
  inputInnerChamber: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 18,
  },
  inputIconWrap: {
    marginRight: 11,
  },
  inputField: {
    flex: 1,
    fontFamily: fontSans,
    color: palette.textPrimary,
    fontSize: 14.5,
    paddingVertical: 11,
  },
  inputRightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 10,
  },
  inputRightDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
  },
});
