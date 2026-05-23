// Purpose: React hook dong goi state/effect dung lai trong UI.
import { useCallback, useEffect, useSyncExternalStore } from 'react';

const THEME_KEY = 'ticketRushTheme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
  window.dispatchEvent(new CustomEvent('ticketrush-theme-change'));
}

function subscribe(callback) {
  window.addEventListener('ticketrush-theme-change', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('ticketrush-theme-change', callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot() {
  return getInitialTheme();
}

if (typeof window !== 'undefined') {
  applyTheme(getInitialTheme());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'dark');

  const setTheme = useCallback((theme) => {
    applyTheme(theme);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme]);

  return { theme, setTheme, toggleTheme };
}