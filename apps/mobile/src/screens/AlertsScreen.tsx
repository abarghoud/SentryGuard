import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import type { JSX } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useScreenTopInset } from '../core/design/use-screen-inset';
import { useThemeColors } from '../core/theme';
import { AppText, Icon, SegmentedControl, Surface } from '../core/ui';
import { clearAlertsUseCase, getAlertsUseCase } from '../features/alerts/di';
import {
  AlertFilter,
  filterAlerts,
  formatAlertDate,
  resolveAlertError,
  resolveAlertIcon,
  resolveAlertMessageKey,
  resolveAlertTitleKey,
  resolveAlertTone,
  resolveFilterLabelKey,
} from './alerts/alerts.helpers';

export function AlertsScreen(): JSX.Element {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState(AlertFilter.All);
  const [isClearingAlerts, setIsClearingAlerts] = useState(false);
  const colors = useThemeColors();
  const topInset = useScreenTopInset();
  const alertsQuery = useQuery({
    queryFn: () => getAlertsUseCase.execute(),
    queryKey: ['alerts'],
    refetchInterval: 30000,
  });
  const alerts = alertsQuery.data ?? [];
  const hasClearableAlerts = alerts.length > 0;
  const filteredAlerts = useMemo(() => filterAlerts(alerts, activeFilter), [activeFilter, alerts]);

  const refetchAlerts = alertsQuery.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetchAlerts();
    }, [refetchAlerts])
  );

  const clearAlerts = async (): Promise<void> => {
    setIsClearingAlerts(true);

    try {
      await clearAlertsUseCase.execute();
      queryClient.setQueryData(['alerts'], []);
    } finally {
      setIsClearingAlerts(false);
    }
  };

  const isEmpty = !alertsQuery.isLoading && !alertsQuery.error && filteredAlerts.length === 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.systemGroupedBackground }}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.sm }]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={alertsQuery.isFetching} onRefresh={() => void alertsQuery.refetch()} />}
    >
      <View style={styles.titleRow}>
        <AppText variant={TextVariant.LargeTitle}>{t('alerts.title')}</AppText>
        <Pressable
          accessibilityRole="button"
          disabled={!hasClearableAlerts || isClearingAlerts}
          hitSlop={10}
          onPress={() => void clearAlerts()}
        >
          <AppText variant={TextVariant.Body} color={hasClearableAlerts && !isClearingAlerts ? colors.systemBlue : colors.tertiaryLabel}>
            {t('alerts.clear')}
          </AppText>
        </Pressable>
      </View>

      <SegmentedControl<AlertFilter>
        value={activeFilter}
        onChange={setActiveFilter}
        options={Object.values(AlertFilter).map((filter) => ({ label: t(resolveFilterLabelKey(filter)), value: filter }))}
      />

      {alertsQuery.isLoading ? <StateCard text={t('alerts.loading')} /> : null}
      {alertsQuery.error ? <StateCard text={resolveAlertError(alertsQuery.error, t)} /> : null}
      {isEmpty ? <StateCard text={t('alerts.empty')} /> : null}

      <View style={styles.list}>
        {filteredAlerts.map((item) => {
          const tone = resolveAlertTone(item, colors);

          return (
            <Surface key={item.id} style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: tone }]}>
                <Icon name={resolveAlertIcon(item)} size={18} color={colors.onAccent} />
              </View>
              <View style={styles.cardText}>
                <View style={styles.cardHeader}>
                  <AppText variant={TextVariant.Headline} style={styles.cardTitle}>
                    {t(resolveAlertTitleKey(item))}
                  </AppText>
                  <AppText variant={TextVariant.Caption1} color={colors.secondaryLabel}>
                    {formatAlertDate(item.created_at, i18n.language)}
                  </AppText>
                </View>
                <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
                  {t(resolveAlertMessageKey(item))}
                </AppText>
                <AppText variant={TextVariant.Caption1} color={colors.tertiaryLabel}>
                  {item.vehicle_display_name ?? item.vin}
                </AppText>
              </View>
            </Surface>
          );
        })}
      </View>
    </ScrollView>
  );
}

function StateCard({ text }: { text: string }): JSX.Element {
  const colors = useThemeColors();

  return (
    <Surface style={styles.stateCard}>
      <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel} style={styles.stateText}>
        {text}
      </AppText>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cardText: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl * 3,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  list: {
    gap: spacing.md,
  },
  stateCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  stateText: {
    textAlign: 'center',
  },
  titleRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
});
