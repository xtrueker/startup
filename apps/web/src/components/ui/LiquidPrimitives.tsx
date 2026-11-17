import React, { useState } from 'react';
import sculpturalPearlBg from '../../assets/sculptural-pearl-bg.jpg';

// ============================================================================
// 1. AMBIENT SCULPTURAL PEARL & OBSIDIAN LIQUID GLASS CANVAS
// ============================================================================
interface AmbientPrismCanvasProps {
  intensity?: 'subtle' | 'normal' | 'vivid';
  className?: string;
}

export const AmbientPrismCanvas: React.FC<AmbientPrismCanvasProps> = ({
  intensity: _intensity = 'normal',
  className = '',
}) => {
  const gridCols = [20, 40, 60, 80];
  const gridRows = [22, 46, 70];

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[var(--bg-app)] theme-transition ${className}`}
      aria-hidden="true"
    >
      {/* Sculptural pearl texture — desaturated crisp white pearl in light mode, subtle relief in dark */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-pearl-breath transition-opacity duration-500"
        style={{
          backgroundImage: `url(${sculpturalPearlBg})`,
          opacity: 'var(--pearl-texture-opacity)' as any,
          filter: 'var(--pearl-texture-filter)',
        }}
      />

      {/* Single theme-driven veil (pure white #FFFFFF in light mode, obsidian #070A10 in dark mode) */}
      <div
        className="absolute inset-0 transition-colors duration-300"
        style={{ backgroundColor: 'var(--canvas-veil)' }}
      />

      {/* Ambient luminescence (dark mode only, hidden in pure white light mode) */}
      <div
        className="transition-opacity duration-300"
        style={{ opacity: 'var(--canvas-orb-opacity)' as any }}
      >
        <div className="absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full bg-sky-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-24 w-[520px] h-[520px] rounded-full bg-indigo-500/10 blur-[130px]" />
      </div>

      {/* Delicate architectural studio grid */}
      {gridCols.map((pct) => (
        <div
          key={`vc-${pct}`}
          className="absolute top-0 bottom-0 w-px bg-[var(--grid-line)]"
          style={{ left: `${pct}%` }}
        />
      ))}
      {gridRows.map((pct) => (
        <div
          key={`hr-${pct}`}
          className="absolute left-0 right-0 h-px bg-[var(--grid-line)]"
          style={{ top: `${pct}%` }}
        />
      ))}
    </div>
  );
};

// ============================================================================
// 2. SCULPTED CERAMIC & LIQUID-AQUA BRAND MEDALLION (PRISM EMBLEM)
// ============================================================================
export const PrismEmblem: React.FC<{
  size?: number;
  activeAlert?: boolean;
  className?: string;
}> = ({ size = 42, activeAlert = false, className = '' }) => {
  const innerSize = Math.round(size * 0.44);
  const dropletSize = Math.round(size * 0.16);
  const radius = Math.round(size * 0.34);

  return (
    <div
      className={`shrink-0 flex items-center justify-center bg-white dark:bg-[#101622] transition-all duration-300 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        border: activeAlert
          ? '1.2px solid rgba(225, 29, 72, 0.38)'
          : '1.2px solid rgba(148, 163, 184, 0.42)',
        boxShadow: activeAlert
          ? '0 8px 20px -4px rgba(225, 29, 72, 0.25), inset 0 1px 0 rgba(255,255,255,0.6)'
          : '0 8px 20px -4px rgba(14, 165, 233, 0.22), inset 0 1px 0 rgba(255,255,255,0.6)',
      }}
    >
      <div
        className="flex items-center justify-center rotate-45"
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: Math.round(innerSize * 0.28),
          backgroundColor: activeAlert
            ? 'rgba(225, 29, 72, 0.12)'
            : 'rgba(14, 165, 233, 0.13)',
          border: `1.5px solid ${activeAlert ? '#E11D48' : '#0EA5E9'}`,
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: dropletSize,
            height: dropletSize,
            backgroundColor: activeAlert ? '#E11D48' : '#0EA5E9',
          }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// 3. TACTILE FROSTED LIQUID GLASS CARD (3D Specular Bevel + Studio Depth)
// ============================================================================
interface LiquidGlassCardProps {
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
  onClick?: () => void;
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  className = '',
  strong = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-[28px] overflow-hidden theme-transition ${
        strong ? 'liquid-glass-strong' : 'liquid-glass'
      } ${className}`}
    >
      {/* Pure-white top specular glass highlight */}
      <div className="pointer-events-none absolute top-0 left-[8%] right-[8%] h-[1.5px] bg-[var(--specular-rim)] opacity-90" />
      {children}
    </div>
  );
};

// ============================================================================
// 4. SCULPTED PILL BUTTON (Obsidian / Aqua / Glass / Crimson)
// ============================================================================
interface LiquidPillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'obsidian' | 'aqua' | 'glass' | 'crimson';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const LiquidPillButton: React.FC<LiquidPillButtonProps> = ({
  variant = 'obsidian',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}) => {
  const sizeClasses = {
    sm: 'min-h-[36px] px-4 text-xs',
    md: 'min-h-[44px] px-5 text-sm',
    lg: 'min-h-[52px] px-7 text-[15px]',
  }[size];

  const variantClasses = {
    obsidian: 'liquid-pill-obsidian font-semibold',
    aqua: 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-500/40 font-semibold shadow-pill-aqua',
    glass: 'glass-button font-semibold',
    crimson:
      'bg-[#E11D48] hover:bg-[#BE123C] text-white border border-rose-400/50 font-semibold shadow-[0_10px_22px_-6px_rgba(225,29,72,0.38)]',
  }[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`rounded-full inline-flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

// ============================================================================
// 5. 3D CHROME-BEZEL LIQUID GLASS PILL INPUT
// ============================================================================
interface LiquidInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

export const LiquidInput: React.FC<LiquidInputProps> = ({
  label,
  hint,
  leftIcon,
  rightElement,
  containerClassName = '',
  className = '',
  ...rest
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {(label || hint) && (
        <div className="flex items-center justify-between px-1.5">
          {label && (
            <label className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
              {label}
            </label>
          )}
          {hint && (
            <span className="text-[11.5px] text-[var(--text-muted)]">{hint}</span>
          )}
        </div>
      )}

      <div className="liquid-input-bezel">
        <div className="liquid-input-chamber flex items-center rounded-full min-h-[46px] px-4 gap-2.5">
          {leftIcon && (
            <span
              className={`shrink-0 transition-colors ${
                focused ? 'text-[#0EA5E9]' : 'text-[var(--text-muted)]'
              }`}
            >
              {leftIcon}
            </span>
          )}

          <input
            onFocus={(e) => {
              setFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
            className={`flex-1 bg-transparent border-0 outline-none text-[14.5px] text-[var(--text-primary)] placeholder-[var(--text-disabled)] py-2 min-w-0 ${className}`}
            {...rest}
          />

          {rightElement && (
            <div className="flex items-center gap-2.5 pl-2 border-l border-[var(--border-strong)] shrink-0">
              {rightElement}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. CLEAN HUMAN STATUS PILL
// ============================================================================
export const StatusPill: React.FC<{
  label: string;
  tone?: 'aqua' | 'emerald' | 'amber' | 'crimson' | 'neutral';
  pulsing?: boolean;
  className?: string;
}> = ({ label, tone = 'aqua', pulsing = false, className = '' }) => {
  const styles = {
    aqua: 'border-sky-500/30 bg-white/80 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300',
    emerald:
      'border-emerald-500/30 bg-white/80 dark:bg-emerald-950/50 text-teal-700 dark:text-emerald-300',
    amber:
      'border-amber-500/30 bg-white/80 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300',
    crimson:
      'border-rose-500/35 bg-rose-50/90 dark:bg-rose-950/55 text-rose-700 dark:text-rose-300',
    neutral:
      'border-slate-300/70 dark:border-white/15 bg-white/75 dark:bg-white/5 text-[var(--text-secondary)]',
  }[tone];

  const dotColor = {
    aqua: 'bg-[#0EA5E9]',
    emerald: 'bg-[#10B981]',
    amber: 'bg-[#D97706]',
    crimson: 'bg-[#E11D48]',
    neutral: 'bg-[var(--text-muted)]',
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11.5px] font-semibold tracking-tight backdrop-blur-md shadow-xs shrink-0 ${styles} ${className}`}
    >
      <span
        className={`w-[6.5px] h-[6.5px] rounded-full ${dotColor} ${
          pulsing ? 'animate-pulse' : ''
        }`}
      />
      <span>{label}</span>
    </span>
  );
};

// ============================================================================
// 7. FLUID SIGNAL BARS (Telemetry Equalizer)
// ============================================================================
export const TelemetryEqualizer: React.FC<{
  active?: boolean;
  colorClass?: string;
}> = ({ active = true, colorClass = 'bg-[#0EA5E9]' }) => {
  const heights = [42, 85, 62, 100, 56];
  return (
    <div
      className={`flex items-end h-5 gap-[3.5px] ${
        active ? 'opacity-100' : 'opacity-35'
      }`}
    >
      {heights.map((pct, i) => (
        <span
          key={i}
          className={`w-[3.5px] rounded-sm ${colorClass} ${
            active ? 'animate-pulse' : ''
          }`}
          style={{
            height: `${Math.max(25, pct)}%`,
            animationDelay: `${i * 180}ms`,
          }}
        />
      ))}
    </div>
  );
};
