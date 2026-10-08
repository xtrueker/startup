export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    borderRadius: {
      none: '0px',
      sm: '7px',
      DEFAULT: '7px',
      md: '7px',
      lg: '7px',
      xl: '7px',
      '2xl': '7px',
      '3xl': '7px',
      full: '9999px',
    },
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        mono: ['Poppins', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'xs': '0 0 3px rgba(0, 0, 0, 0.04)',
        'sm': '0 0 6px rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 0 8px rgba(0, 0, 0, 0.06)',
        'md': '0 0 12px rgba(0, 0, 0, 0.07)',
        'lg': '0 0 16px rgba(0, 0, 0, 0.08)',
        'xl': '0 0 20px rgba(0, 0, 0, 0.09)',
        '2xl': '0 0 28px rgba(0, 0, 0, 0.11)',
        'float': '0 0 10px rgba(0, 0, 0, 0.06)',
        'float-lg': '0 0 16px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
