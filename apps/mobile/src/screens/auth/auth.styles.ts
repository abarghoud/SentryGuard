import { StyleSheet } from 'react-native';

import { ThemeColors } from '../../core/theme';

export type AuthStyles = ReturnType<typeof createAuthStyles>;

export function createAuthStyles(colors: ThemeColors) {
  return StyleSheet.create({
    brand: {
      color: colors.accent,
      fontSize: 17,
      fontWeight: '800',
    },
    advancedActions: {
      flexDirection: 'row',
      gap: 8,
    },
    advancedSection: {
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 10,
      padding: 12,
    },
    apiInput: {
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      color: colors.text,
      padding: 12,
    },
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      flexGrow: 1,
      gap: 20,
      justifyContent: 'space-between',
      padding: 20,
      paddingBottom: 10,
    },
    hero: {
      gap: 10,
      paddingTop: 24,
    },
    disabledButton: {
      opacity: 0.65,
    },
    input: {
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      color: colors.text,
      minHeight: 72,
      padding: 12,
      textAlignVertical: 'top',
    },
    keyboardAvoider: {
      flex: 1,
    },
    manualLabel: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    message: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 12,
      padding: 14,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 8,
      padding: 15,
    },
    primaryButtonText: {
      color: colors.accentText,
      fontSize: 16,
      fontWeight: '800',
    },
    smallButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      padding: 11,
    },
    smallButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
    },
    scroller: {
      flex: 1,
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
      lineHeight: 35,
    },
  });
}
