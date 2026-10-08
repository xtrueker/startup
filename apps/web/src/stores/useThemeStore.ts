import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const applyTheme = (t: Theme) => {
  const root = document.documentElement;
  if (t === 'light') {
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
  } else {
    root.removeAttribute('data-theme');
    root.classList.add('dark');
  }
};

const saved = (localStorage.getItem('rc_theme') as Theme | null) ?? 'dark';
applyTheme(saved);

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: saved,
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('rc_theme', next);
      applyTheme(next);
      return { theme: next };
    }),
  setTheme: (t) => {
    localStorage.setItem('rc_theme', t);
    applyTheme(t);
    set({ theme: t });
  },
}));
