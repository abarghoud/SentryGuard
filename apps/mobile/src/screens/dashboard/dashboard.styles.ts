import { StyleSheet } from 'react-native';

import { ThemeColors } from '../../core/theme';

export type DashboardStyles = ReturnType<typeof createDashboardStyles>;

export function createDashboardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 18,
      padding: 16,
    },
    cardAction: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      paddingVertical: 12,
    },
    cardActionText: {
      color: colors.text,
      fontWeight: '800',
    },
    cardHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
    container: {
      flex: 1,
    },
    empty: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 28,
    },
    emptyText: {
      color: colors.muted,
      textAlign: 'center',
    },
    header: {
      gap: 6,
      padding: 20,
      paddingBottom: 10,
    },
    kicker: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    keyBanner: {
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderColor: colors.warning,
      borderRadius: 8,
      borderWidth: 1,
      gap: 12,
      marginHorizontal: 20,
      padding: 14,
    },
    keyButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    keyButtonText: {
      color: colors.accentText,
      fontWeight: '900',
    },
    keyCopy: {
      gap: 4,
    },
    keyMessage: {
      color: colors.warning,
      fontSize: 12,
      lineHeight: 17,
    },
    keyText: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    keyTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
    },
    listContent: {
      gap: 12,
      padding: 20,
      paddingTop: 12,
    },
    metric: {
      backgroundColor: colors.panel,
      borderRadius: 8,
      flex: 1,
      gap: 4,
      padding: 10,
    },
    metricLabel: {
      color: colors.muted,
      fontSize: 12,
    },
    metricValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    metrics: {
      flexDirection: 'row',
      gap: 8,
    },
    safeBadge: {
      backgroundColor: colors.accent,
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
      fontSize: 15,
    },
    summaryLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 20,
    },
    summaryTile: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      gap: 4,
      padding: 12,
    },
    summaryValue: {
      fontSize: 22,
      fontWeight: '900',
    },
    title: {
      color: colors.text,
      fontSize: 32,
      fontWeight: '900',
    },
    vehicleName: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
    },
    vin: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 4,
    },
    warningBadge: {
      backgroundColor: colors.warning,
    },
  });
}
