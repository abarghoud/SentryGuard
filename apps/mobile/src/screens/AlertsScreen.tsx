import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { useThemeColors } from '../core/theme';
import { clearAlertsUseCase, getAlertsUseCase } from '../features/alerts/di';
import {
  AlertFilter,
  filterAlerts,
  formatAlertDate,
  resolveAlertError,
  resolveAlertTone,
  resolveFilterLabelKey,
} from './alerts/alerts.helpers';
import { AlertStyles, createAlertsStyles } from './alerts/alerts.styles';

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
  const styles = createAlertsStyles(colors);
  const alertsQuery = useQuery({
    queryFn: () => getAlertsUseCase.execute(),
    queryKey: ['alerts'],
    refetchInterval: 30000,
  });
  const alerts = alertsQuery.data ?? [];
  const hasClearableAlerts = alerts.length > 0;
  const filteredAlerts = useMemo(() => filterAlerts(alerts, activeFilter), [activeFilter, alerts]);

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

function StateCard({ styles, text }: { styles: AlertStyles; text: string }): JSX.Element {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateText}>{text}</Text>
    </View>
  );
}
