import { StyleSheet } from 'react-native';

import { ThemeColors } from '../../core/theme';

export type VehicleDetailStyles = ReturnType<typeof createVehicleDetailStyles>;

export function createVehicleDetailStyles(colors: ThemeColors) {
  return StyleSheet.create({
    actionsPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 10,
      padding: 16,
    },
    backButton: {
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    backButtonText: {
      color: colors.text,
      fontWeight: '800',
    },
    betaBadge: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    betaBadgeText: {
      color: colors.accentText,
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      gap: 16,
      paddingBottom: 20,
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    detailTile: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 6,
      padding: 14,
      width: '48%',
    },
    disabledAction: {
      opacity: 0.55,
    },
    feedback: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
    },
    loadingContainer: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    loadingText: {
      color: colors.muted,
    },
    lockedButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 10,
    },
    lockedPanel: {
      backgroundColor: colors.panel,
      borderRadius: 8,
      gap: 10,
      padding: 14,
    },
    lockedButtonText: {
      color: colors.accentText,
      fontSize: 12,
      fontWeight: '900',
      textAlign: 'center',
    },
    toggleCopy: {
      flex: 1,
      gap: 4,
    },
    toggleDescription: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    togglePanel: {
      alignItems: 'center',
      backgroundColor: colors.panel,
      borderRadius: 8,
      flexDirection: 'row',
      gap: 14,
      justifyContent: 'space-between',
      padding: 14,
    },
    toggleTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '900',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'space-between',
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
    labelRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    panelTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    safeBadge: {
      backgroundColor: colors.accent,
    },
    settingGroup: {
      gap: 10,
    },
    statusBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    statusText: {
      color: colors.accentText,
      fontSize: 12,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 13,
    },
    tileLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    tileValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
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
      backgroundColor: colors.border,
    },
    toggleTrackOn: {
      backgroundColor: colors.control,
    },
    title: {
      color: colors.text,
      fontSize: 32,
      fontWeight: '900',
    },
    topBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    warningBadge: {
      backgroundColor: colors.warning,
    },
  });
}
