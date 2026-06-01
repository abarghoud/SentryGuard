import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import type { Theme as NavigationTheme } from '@react-navigation/native';

import { ThemeColors, ThemeMode } from '../theme';

export function createNavigationTheme(colors: ThemeColors, mode: ThemeMode): NavigationTheme {
  const baseTheme = mode === ThemeMode.Dark ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.systemGroupedBackground,
      border: colors.separator,
      card: colors.secondarySystemGroupedBackground,
      notification: colors.systemRed,
      primary: colors.systemBlue,
      text: colors.label,
    },
  };
}
