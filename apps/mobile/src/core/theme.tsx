import { createContext, useCallback, useContext, useEffect, useMemo, useState, type JSX, type ReactNode } from 'react';

import { getStoredThemeMode, storeThemeMode } from './theme-storage';

export enum ThemeMode {
  Dark = 'dark',
  Light = 'light',
}

export interface ThemeColors {
  // Legacy tokens (kept stable so existing screens keep compiling), remapped to iOS semantics.
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

  // iOS semantic tokens (HIG).
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  systemBackground: string;
  secondarySystemBackground: string;
  tertiarySystemBackground: string;
  systemGroupedBackground: string;
  secondarySystemGroupedBackground: string;
  separator: string;
  fill: string;
  secondaryFill: string;
  systemBlue: string;
  systemGreen: string;
  systemRed: string;
  systemOrange: string;
  onAccent: string;
}

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode(mode: ThemeMode): Promise<void>;
}

const lightColors: ThemeColors = {
  // iOS semantic structure, mapped to the original brand palette.
  label: '#111827',
  secondaryLabel: '#4b5563',
  tertiaryLabel: '#9ca3af',
  systemBackground: '#ffffff',
  secondarySystemBackground: '#f3f4f6',
  tertiarySystemBackground: '#ffffff',
  systemGroupedBackground: '#f2f2f7',
  secondarySystemGroupedBackground: '#ffffff',
  separator: '#e5e7eb',
  fill: '#f3f4f6',
  secondaryFill: '#e5e7eb',
  systemBlue: '#dc2626', // brand accent (red)
  systemGreen: '#dc2626', // positive states use the brand accent (no green)
  systemRed: '#b91c1c', // destructive / critical (deeper, distinct from accent)
  systemOrange: '#ca8a04',
  onAccent: '#ffffff',

  // Legacy aliases
  accent: '#dc2626',
  accentText: '#ffffff',
  background: '#f9fafb',
  border: '#e5e7eb',
  control: '#dc2626',
  critical: '#b91c1c',
  muted: '#4b5563',
  panel: '#f3f4f6',
  positive: '#dc2626',
  surface: '#ffffff',
  text: '#111827',
  warning: '#ca8a04',
};

const darkColors: ThemeColors = {
  // iOS semantic (dark)
  label: '#FFFFFF',
  secondaryLabel: 'rgba(235, 235, 245, 0.6)',
  tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
  systemBackground: '#000000',
  secondarySystemBackground: '#1C1C1E',
  tertiarySystemBackground: '#2C2C2E',
  systemGroupedBackground: '#000000',
  secondarySystemGroupedBackground: '#1C1C1E',
  separator: 'rgba(84, 84, 88, 0.6)',
  fill: 'rgba(120, 120, 128, 0.36)',
  secondaryFill: 'rgba(120, 120, 128, 0.32)',
  systemBlue: '#0A84FF',
  systemGreen: '#0A84FF', // positive states use the accent (no green)
  systemRed: '#FF453A',
  systemOrange: '#FF9F0A',
  onAccent: '#FFFFFF',

  // Legacy aliases
  accent: '#0A84FF',
  accentText: '#FFFFFF',
  background: '#000000',
  border: 'rgba(84, 84, 88, 0.6)',
  control: '#0A84FF',
  critical: '#FF453A',
  muted: 'rgba(235, 235, 245, 0.6)',
  panel: '#2C2C2E',
  positive: '#0A84FF',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  warning: '#FF9F0A',
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

  const isDark = mode === ThemeMode.Dark;
  const colors = isDark ? darkColors : lightColors;
  const value = useMemo(() => ({ colors, isDark, mode, setMode: updateMode }), [colors, isDark, mode, updateMode]);

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
