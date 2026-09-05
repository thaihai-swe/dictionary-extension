import { useEffect, useState } from 'react';
import { AppTheme } from '../types';

export function resolveIsDark(theme: AppTheme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true;
}

export function syncDocumentTheme(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  document.documentElement.classList.toggle('light-theme', !isDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  if (document.body) {
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
    document.body.classList.toggle('light-theme', !isDark);
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }
}

export function useAppTheme(
  theme: AppTheme,
  options?: {
    syncDocument?: boolean;
    saveSettings?: (partial: { theme: AppTheme }) => void | Promise<void>;
  },
) {
  const syncDocument = options?.syncDocument === true;
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => resolveIsDark(theme));

  useEffect(() => {
    const isDark = resolveIsDark(theme);
    setIsDarkMode(isDark);
    if (syncDocument) syncDocumentTheme(isDark);

    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
        if (syncDocument) syncDocumentTheme(e.matches);
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme, syncDocument]);

  function toggleTheme() {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (syncDocument) syncDocumentTheme(next);
    if (options?.saveSettings) {
      void options.saveSettings({ theme: next ? 'dark' : 'light' });
    }
  }

  return { isDarkMode, toggleTheme };
}
