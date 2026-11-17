export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        obsidian: {
          DEFAULT: '#0C0F14',
          hover: '#181E29',
        },
        aqua: {
          DEFAULT: '#0EA5E9',
          soft: '#38BDF8',
          mint: '#14B8A6',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Plus Jakarta Sans"', 'Inter', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'xs': '0 2px 6px -1px rgba(15, 23, 42, 0.05)',
        'sm': '0 4px 12px -2px rgba(15, 23, 42, 0.06)',
        'DEFAULT': '0 10px 24px -6px rgba(15, 23, 42, 0.08)',
        'md': '0 14px 32px -8px rgba(15, 23, 42, 0.10)',
        'lg': '0 20px 44px -10px rgba(15, 23, 42, 0.12)',
        'xl': '0 28px 60px -15px rgba(15, 23, 42, 0.14)',
        '2xl': '0 32px 72px -16px rgba(15, 23, 42, 0.18)',
        'glass': '0 28px 60px -15px rgba(15, 23, 42, 0.11), 0 8px 20px -6px rgba(15, 23, 42, 0.05), inset 0 1.5px 0 0 rgba(255, 255, 255, 0.95)',
        'glass-dark': '0 28px 60px -15px rgba(0, 0, 0, 0.65), 0 8px 20px -6px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)',
        'pill-obsidian': '0 10px 24px -6px rgba(12, 15, 20, 0.28), 0 2px 6px -1px rgba(15, 23, 42, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.35)',
        'pill-aqua': '0 10px 24px -6px rgba(14, 165, 233, 0.26), inset 0 1px 0 0 rgba(255, 255, 255, 0.45)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pearl-breath': 'pearlBreath 22s ease-in-out infinite',
      },
      keyframes: {
        pearlBreath: {
          '0%, 100%': { transform: 'scale(1.01)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
};
