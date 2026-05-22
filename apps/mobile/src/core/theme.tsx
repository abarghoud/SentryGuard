import { createContext, useCallback, useContext, useEffect, useMemo, useState, type JSX, type ReactNode } from 'react';

import { getStoredThemeMode, storeThemeMode } from './theme-storage';

export enum ThemeMode {
  Dark = 'dark',
  Light = 'light',
}

export interface ThemeColors {
  accent: string;
  accentText: string;
  background: string;
  border: string;
  control: string;
  critical: string;
  muted: string;
  panel: string;
  positive: string;
  surface: string;
  text: string;
  warning: string;
}

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  setMode(mode: ThemeMode): Promise<void>;
}

const darkColors: ThemeColors = {
  accent: '#43e6a1',
  accentText: '#07110f',
  background: '#07110f',
  border: '#22352f',
  control: '#43e6a1',
  critical: '#ff5a6a',
  muted: '#94aaa1',
  panel: '#10201b',
  positive: '#43e6a1',
  surface: '#0b1714',
  text: '#edf7f3',
  warning: '#ffd166',
};

const lightColors: ThemeColors = {
  accent: '#dc2626',
  accentText: '#ffffff',
  background: '#f9fafb',
  border: '#e5e7eb',
  control: '#dc2626',
  critical: '#dc2626',
  muted: '#4b5563',
  panel: '#f3f4f6',
  positive: '#16a34a',
  surface: '#ffffff',
  text: '#111827',
  warning: '#ca8a04',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [mode, setMode] = useState(ThemeMode.Light);
  const updateMode = useCallback(async (nextMode: ThemeMode): Promise<void> => {
    setMode(nextMode);
    await storeThemeMode(nextMode);
  }, []);

  useEffect(() => {
    getStoredThemeMode().then((storedMode) => {
      if (storedMode) {
        setMode(storedMode);
      }
    });
  }, []);

  const colors = mode === ThemeMode.Dark ? darkColors : lightColors;
  const value = useMemo(() => ({ colors, mode, setMode: updateMode }), [colors, mode, updateMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}

export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
