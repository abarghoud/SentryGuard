import { StyleSheet } from 'react-native';

import { ThemeColors } from '../../core/theme';

export type SettingsStyles = ReturnType<typeof createSettingsStyles>;

export function createSettingsStyles(colors: ThemeColors) {
  return StyleSheet.create({
    activeThemeOption: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    activeThemeOptionText: {
      color: colors.accentText,
    },
    container: {
      flex: 1,
    },
    content: {
      gap: 16,
      padding: 20,
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
    logoutButton: {
      alignItems: 'center',
      borderColor: colors.critical,
      borderRadius: 8,
      borderWidth: 1,
      padding: 14,
    },
    logoutText: {
      color: colors.critical,
      fontSize: 15,
      fontWeight: '900',
    },
    disabledSwitch: {
      opacity: 0.55,
    },
    disabledPreferenceRow: {
      opacity: 0.55,
    },
    disabledRowValue: {
      color: colors.muted,
    },
    dndAccessModal: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 12,
      maxWidth: 360,
      padding: 16,
      width: '100%',
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
    },
    modalBackdrop: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    modalDescription: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
    },
    preferenceRow: {
      alignItems: 'center',
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 62,
      paddingHorizontal: 16,
    },
    describedPreferenceRow: {
      paddingVertical: 12,
    },
    preferenceText: {
      flex: 1,
      gap: 4,
      paddingRight: 12,
    },
    nestedPreferenceRow: {
      paddingLeft: 28,
    },
    nestedRowValue: {
      fontSize: 14,
    },
    row: {
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      gap: 4,
      padding: 16,
    },
    rowLabel: {
      color: colors.muted,
      fontSize: 13,
    },
    rowValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    sectionTitle: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '900',
      marginBottom: -8,
      paddingHorizontal: 4,
      textTransform: 'uppercase',
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 12,
    },
    primaryButtonText: {
      color: colors.accentText,
      fontSize: 13,
      fontWeight: '900',
    },
    secondaryButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      paddingVertical: 11,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 15,
    },
    statusText: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      paddingHorizontal: 4,
    },
    themeHeader: {
      gap: 4,
      padding: 16,
      paddingBottom: 10,
    },
    themeOption: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      paddingVertical: 12,
    },
    themeOptionText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
    },
    themeSelector: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      paddingTop: 0,
    },
    toggleThumb: {
      backgroundColor: colors.accentText,
      borderRadius: 10,
      height: 20,
      width: 20,
    },
    toggleThumbOff: {
      backgroundColor: colors.muted,
      transform: [{ translateX: 2 }],
    },
    toggleThumbOn: {
      transform: [{ translateX: 24 }],
    },
    toggleTrack: {
      borderRadius: 14,
      height: 28,
      justifyContent: 'center',
      width: 48,
    },
    toggleTrackOff: {
      backgroundColor: colors.panel,
      borderColor: colors.border,
      borderWidth: 1,
    },
    toggleTrackOn: {
      backgroundColor: colors.control,
    },
    title: {
      color: colors.text,
      fontSize: 32,
      fontWeight: '900',
    },
  });
}
