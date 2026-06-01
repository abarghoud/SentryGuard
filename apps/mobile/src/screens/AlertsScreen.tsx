import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemeColors, useThemeColors } from '../core/theme';
import { AlertEventSeverity, type AlertEvent } from '../features/alerts/domain/entities';
import { clearAlertsUseCase, getAlertsUseCase } from '../features/alerts/di';

enum AlertFilter {
  All = 'all',
  Critical = 'critical',
  Warning = 'warning',
}

interface AlertsScreenProps {
  isActive: boolean;
}

export function AlertsScreen({ isActive }: AlertsScreenProps): JSX.Element {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState(AlertFilter.All);
  const [isClearingAlerts, setIsClearingAlerts] = useState(false);
  const refetchAlertsRef = useRef<() => Promise<unknown>>(async () => undefined);
  const wasActiveRef = useRef(false);
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const alertsQuery = useQuery({
    queryFn: () => getAlertsUseCase.execute(),
    queryKey: ['alerts'],
    refetchInterval: 30000,
  });
  const alerts = alertsQuery.data ?? [];
  const hasClearableAlerts = alerts.length > 0;
  const filteredAlerts = useMemo(
    () => filterAlerts(alerts, activeFilter),
    [activeFilter, alerts]
  );

  useEffect(() => {
    refetchAlertsRef.current = alertsQuery.refetch;
  }, [alertsQuery.refetch]);

  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      void refetchAlertsRef.current();
    }

    wasActiveRef.current = isActive;
  }, [isActive]);

  const clearAlerts = async (): Promise<void> => {
    setIsClearingAlerts(true);

    try {
      await clearAlertsUseCase.execute();
      queryClient.setQueryData(['alerts'], []);
    } finally {
      setIsClearingAlerts(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={alertsQuery.isFetching} onRefresh={() => void alertsQuery.refetch()} />}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.kicker}>{t('alerts.kicker')}</Text>
            <Text style={styles.title}>{t('alerts.title')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!hasClearableAlerts || isClearingAlerts}
            hitSlop={10}
            onPress={() => void clearAlerts()}
            style={[styles.clearButton, !hasClearableAlerts || isClearingAlerts ? styles.disabledClearButton : null]}
          >
            <Text style={[styles.clearButtonText, !hasClearableAlerts || isClearingAlerts ? styles.disabledClearButtonText : null]}>{t('alerts.clear')}</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>{t('alerts.subtitle')}</Text>
      </View>

      <View style={styles.filters}>
        {Object.values(AlertFilter).map((filter) => (
          <Pressable
            key={filter}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === filter }}
            onPress={() => setActiveFilter(filter)}
            style={[styles.filterButton, activeFilter === filter ? styles.activeFilterButton : null]}
          >
            <Text style={[styles.filterText, activeFilter === filter ? styles.activeFilterText : null]}>{t(resolveFilterLabelKey(filter))}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {alertsQuery.isLoading ? <StateCard styles={styles} text={t('alerts.loading')} /> : null}
        {alertsQuery.error ? <StateCard styles={styles} text={resolveAlertError(alertsQuery.error, t)} /> : null}
        {!alertsQuery.isLoading && !alertsQuery.error && filteredAlerts.length === 0 ? (
          <StateCard styles={styles} text={t('alerts.empty')} />
        ) : null}
        {filteredAlerts.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={[styles.rail, { backgroundColor: resolveAlertTone(item, colors) }]} />
            <View style={styles.cardText}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardTime}>{formatAlertDate(item.created_at, i18n.language)}</Text>
              </View>
              <Text style={styles.cardSubtitle}>{item.message}</Text>
              <Text style={styles.cardMeta}>{item.vehicle_display_name ?? item.vin}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

type AlertStyles = ReturnType<typeof createStyles>;

function StateCard({ styles, text }: { styles: AlertStyles; text: string }): JSX.Element {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateText}>{text}</Text>
    </View>
  );
}

function filterAlerts(alerts: AlertEvent[], activeFilter: AlertFilter): AlertEvent[] {
  if (activeFilter === AlertFilter.Critical) {
    return alerts.filter((alert) => alert.severity === AlertEventSeverity.Critical);
  }

  if (activeFilter === AlertFilter.Warning) {
    return alerts.filter((alert) => alert.severity === AlertEventSeverity.Warning);
  }

  return alerts;
}

function resolveAlertTone(alert: AlertEvent, colors: ThemeColors): string {
  return alert.severity === AlertEventSeverity.Critical ? colors.critical : colors.warning;
}

function formatAlertDate(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', hour: '2-digit', minute: '2-digit', month: '2-digit' }).format(new Date(value));
}

function resolveAlertError(error: unknown, t: (key: string) => string): string {
  return error instanceof Error ? error.message : t('alerts.error');
}

function resolveFilterLabelKey(filter: AlertFilter): string {
  return `alerts.filter.${filter}`;
}

function createStyles(colors: ThemeColors) {
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
