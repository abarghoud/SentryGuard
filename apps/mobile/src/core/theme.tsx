import { createContext, useCallback, useContext, useEffect, useMemo, useState, type JSX, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme, type ColorSchemeName } from 'react-native';

import { getStoredThemeMode, storeThemeMode } from './theme-storage';

export enum ThemeMode {
  Dark = 'dark',
  Light = 'light',
  System = 'system',
}

export function resolveIsDark(mode: ThemeMode, systemScheme: ColorSchemeName): boolean {
  if (mode === ThemeMode.System) {
    return systemScheme === 'dark';
  }

  return mode === ThemeMode.Dark;
}

export interface ThemeColors {
  accent: string;
  accentFill: string;
  criticalFill: string;
  fill: string;
  label: string;
  onAccent: string;
  onCritical: string;
  onSuccess: string;
  onWarning: string;
  overlay: string;
  pressedOverlay: string;
  secondaryFill: string;
  secondaryLabel: string;
  secondarySystemBackground: string;
  secondarySystemGroupedBackground: string;
  separator: string;
  successBorder: string;
  successFill: string;
  successSurface: string;
  switchThumb: string;
  systemBackground: string;
  systemGreen: string;
  systemGroupedBackground: string;
  systemRed: string;
  tertiaryLabel: string;
  tertiarySystemBackground: string;
  warningBorder: string;
  warningFill: string;
  warningSurface: string;
}

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode(mode: ThemeMode): Promise<void>;
}

export const lightColors: ThemeColors = {
  accent: '#dc2626', // brand red, also the primary action color
  accentFill: '#dc2626', // deep stable fill for primary buttons, keeps white labels readable
  criticalFill: '#dc2626', // critical-severity red for the security event log
  fill: '#f3f4f6',
  label: '#111827',
  onAccent: '#ffffff',
  onCritical: '#ffffff',
  onSuccess: '#ffffff',
  onWarning: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.4)',
  pressedOverlay: 'rgba(0, 0, 0, 0.07)',
  secondaryFill: '#e5e7eb',
  secondaryLabel: '#4b5563',
  secondarySystemBackground: '#f3f4f6',
  secondarySystemGroupedBackground: '#ffffff',
  separator: '#e5e7eb',
  successBorder: 'rgba(21, 128, 61, 0.22)',
  successFill: '#15803d',
  successSurface: 'rgba(21, 128, 61, 0.06)',
  switchThumb: '#ffffff',
  systemBackground: '#ffffff',
  systemGreen: '#15803d',
  systemGroupedBackground: '#f2f2f7',
  systemRed: '#b91c1c', // destructive / critical (deeper, distinct from accent)
  tertiaryLabel: '#888f9c',
  tertiarySystemBackground: '#ffffff',
  warningBorder: 'rgba(120, 120, 128, 0.24)',
  warningFill: '#b45309', // alert-severity amber, reserved for the security event log
  warningSurface: 'rgba(120, 120, 128, 0.1)',
};

export const darkColors: ThemeColors = {
  accent: '#ef4444', // brand red lifted for dark backgrounds
  accentFill: '#dc2626', // deep stable fill for primary buttons, keeps white labels readable
  criticalFill: '#dc2626', // critical-severity red for the security event log
  fill: 'rgba(120, 120, 128, 0.36)',
  label: '#FFFFFF',
  onAccent: '#FFFFFF',
  onCritical: '#ffffff',
  onSuccess: '#ffffff',
  onWarning: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.6)',
  pressedOverlay: 'rgba(0, 0, 0, 0.28)',
  secondaryFill: 'rgba(120, 120, 128, 0.32)',
  secondaryLabel: 'rgba(235, 235, 245, 0.6)',
  secondarySystemBackground: '#1C1C1E',
  secondarySystemGroupedBackground: '#1C1C1E',
  separator: 'rgba(84, 84, 88, 0.6)',
  successBorder: 'rgba(48, 209, 88, 0.19)',
  successFill: '#15803d', // deep green that keeps white content readable on dark
  successSurface: 'rgba(48, 209, 88, 0.08)',
  switchThumb: '#ffffff',
  systemBackground: '#000000',
  systemGreen: '#30d158',
  systemGroupedBackground: '#000000',
  systemRed: '#FF453A',
  tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
  tertiarySystemBackground: '#2C2C2E',
  warningBorder: 'rgba(120, 120, 128, 0.36)',
  warningFill: '#b45309', // alert-severity amber, reserved for the security event log
  warningSurface: 'rgba(120, 120, 128, 0.16)',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState(ThemeMode.System);
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

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    Appearance.setColorScheme(mode === ThemeMode.System ? null : mode);
  }, [mode]);

  const isDark = resolveIsDark(mode, systemScheme);
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
