/**
 * Dark / light appearance. The choice is saved per device and applied as
 * <html data-theme="…"> before the first render (main.tsx), so there is no flash.
 * Colours come from src/styles/theme.css; light mode inverts each palette.
 * Public pages (landing, sign-in) keep their dark design by setting
 * data-theme="dark" on their own root.
 */
import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const KEY = 'muz-theme';
const EVENT = 'muz-theme-change';

export function readTheme(): Theme {
  try {
    return window.localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f1f5f9' : '#070b14');
}

export function setTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    // Storage unavailable: the choice lasts for this page only.
  }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

/** Current theme, kept in sync across every component that uses it. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setState] = useState<Theme>(readTheme);
  useEffect(() => {
    const on = (e: Event) => setState((e as CustomEvent<Theme>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return [theme, setTheme];
}
