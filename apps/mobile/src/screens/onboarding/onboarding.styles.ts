import { StyleSheet } from 'react-native';

import { ThemeColors } from '../../core/theme';

export type OnboardingStyles = ReturnType<typeof createOnboardingStyles>;

export function createOnboardingStyles(colors: ThemeColors) {
  return StyleSheet.create({
    actions: {
      gap: 10,
    },
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      gap: 16,
      padding: 20,
    },
    disabled: {
      opacity: 0.55,
    },
    header: {
      gap: 6,
    },
    kicker: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    legalText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 18,
    },
    message: {
      color: colors.warning,
      fontSize: 13,
      lineHeight: 19,
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 16,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 8,
      padding: 15,
    },
    primaryButtonText: {
      color: colors.accentText,
      fontSize: 15,
      fontWeight: '900',
    },
    secondaryButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 14,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    stepNumber: {
      color: colors.accentText,
      fontSize: 12,
      fontWeight: '900',
    },
    stepRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    stepText: {
      color: colors.text,
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
    },
    steps: {
      gap: 12,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 21,
    },
    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '900',
    },
  });
}
