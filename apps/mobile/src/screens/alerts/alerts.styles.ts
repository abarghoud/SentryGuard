import { StyleSheet } from 'react-native';

import { ThemeColors } from '../../core/theme';

export type AlertStyles = ReturnType<typeof createAlertsStyles>;

export function createAlertsStyles(colors: ThemeColors) {
  return StyleSheet.create({
    activeFilterButton: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    activeFilterText: {
      color: colors.accentText,
    },
    card: {
      alignItems: 'stretch',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    cardHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
    cardSubtitle: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
    },
    cardMeta: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    cardText: {
      flex: 1,
      gap: 4,
      padding: 16,
    },
    cardTime: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    cardTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
    },
    clearButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    clearButtonText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '900',
    },
    container: {
      flex: 1,
    },
    content: {
      paddingBottom: 20,
    },
    disabledClearButton: {
      opacity: 0.45,
    },
    disabledClearButtonText: {
      color: colors.muted,
    },
    filterButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      paddingVertical: 10,
    },
    filterText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '800',
    },
    filters: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 20,
    },
    rail: {
      width: 5,
    },
    header: {
      gap: 6,
      padding: 20,
      paddingBottom: 12,
    },
    kicker: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    list: {
      gap: 12,
      padding: 20,
      paddingTop: 14,
    },
    stateCard: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 20,
    },
    stateText: {
      color: colors.muted,
      fontSize: 14,
      textAlign: 'center',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 21,
    },
    title: {
      color: colors.text,
      fontSize: 32,
      fontWeight: '900',
    },
    titleCopy: {
      flex: 1,
      gap: 6,
    },
    titleRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
  });
}
