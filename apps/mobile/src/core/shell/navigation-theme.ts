import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import type { Theme as NavigationTheme } from '@react-navigation/native';

import { ThemeColors } from '../theme';

export function createNavigationTheme(colors: ThemeColors, isDark: boolean): NavigationTheme {
  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.systemGroupedBackground,
      border: colors.separator,
      card: colors.secondarySystemGroupedBackground,
      notification: colors.systemRed,
      primary: colors.accent,
      text: colors.label,
    },
  };
}
