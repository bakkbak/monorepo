import { useState, useEffect } from 'react';
import { storageGet, storageSet } from './storage';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'teevo-theme';

export function useTheme() {
  // Storage is async on native, so we default to light and hydrate the stored
  // preference in an effect on first mount. The DOM class is applied on every
  // theme change (including the initial hydration).
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    let cancelled = false;
    storageGet(STORAGE_KEY).then((stored) => {
      if (!cancelled && stored === 'dark') setThemeState('dark');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    void storageSet(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  const setTheme = (t: Theme) => setThemeState(t);

  return { theme, toggleTheme, setTheme };
}
