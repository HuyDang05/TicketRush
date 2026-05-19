const THEME_KEY = 'ticketRushTheme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
  localStorage.setItem(THEME_KEY, theme);
}

// Initialize immediately on module load so admin pages (no Header) still get correct theme
if (typeof window !== 'undefined') {
  applyTheme(getInitialTheme());
}

import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sync if another tab changes localStorage
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === THEME_KEY && e.newValue) {
        setThemeState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((t) => {
    setThemeState(t);
  }, []);

  return { theme, toggleTheme, setTheme };
}
