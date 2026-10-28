import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import type { JSX } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { readableContent, screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useHaptics } from '../core/design/use-haptics';
import { useListDetail } from '../core/design/use-list-detail';
import { useScreenTopInset } from '../core/design/use-screen-inset';
import { useUserInitiatedRefresh } from '../core/hooks/use-user-initiated-refresh';
import { useThemeColors } from '../core/theme';
import { AppText, CenteredPane, Icon, SegmentedControl, SplitPanes, Surface } from '../core/ui';
import { clearAlertsUseCase, deleteAlertUseCase, useAlertsQuery } from '../features/alerts/di';
import { AlertEvent } from '../features/alerts/domain/entities';
import { AlertCard } from './alerts/components/AlertCard';
import { AlertDetailView } from './alerts/components/AlertDetailView';
import {
  AlertFilter,
  confirmClearAlerts,
  filterAlerts,
  isAlertUnread,
  resolveAlertError,
  resolveFilterLabelKey,
  resolveSelectedAlert,
} from './alerts/alerts.helpers';
import { useAlertsSeen } from './alerts/use-alerts-seen';

export function AlertsScreen(): JSX.Element {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const haptics = useHaptics();
  const [activeFilter, setActiveFilter] = useState(AlertFilter.All);
  const [isClearingAlerts, setIsClearingAlerts] = useState(false);
  const colors = useThemeColors();
  const topInset = useScreenTopInset();
  const alertSelection = useListDetail<string>();
  const { lastSeenAt, markAlertsSeen } = useAlertsSeen();
  const alertsQuery = useAlertsQuery();
  const alerts = alertsQuery.data ?? [];
  const hasClearableAlerts = alerts.length > 0;
  const filteredAlerts = useMemo(() => filterAlerts(alerts, activeFilter), [activeFilter, alerts]);
  const displayedAlert = alertSelection.isSplit ? resolveSelectedAlert(filteredAlerts, alertSelection.selectedId) : null;

  const refetchAlerts = alertsQuery.refetch;
  const { isRefreshing, onRefresh } = useUserInitiatedRefresh([refetchAlerts]);
  useFocusEffect(
    useCallback(() => {
      void refetchAlerts();
      return () => {
        void markAlertsSeen();
      };
    }, [markAlertsSeen, refetchAlerts])
  );

  const deleteAlertMutation = useMutation({
    mutationFn: (alertId: string) => deleteAlertUseCase.execute(alertId),
    onMutate: async (alertId) => {
      await queryClient.cancelQueries({ queryKey: ['alerts'] });
      const previous = queryClient.getQueryData<AlertEvent[]>(['alerts']);
      queryClient.setQueryData<AlertEvent[]>(['alerts'], (current) => (current ?? []).filter((alert) => alert.id !== alertId));
      return { previous };
    },
    onError: (_error, _alertId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['alerts'], context.previous);
      }
      haptics.error();
    },
    onSuccess: () => {
      haptics.success();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const clearAlerts = async (): Promise<void> => {
    setIsClearingAlerts(true);

    try {
      await clearAlertsUseCase.execute();
      queryClient.setQueryData(['alerts'], []);
    } finally {
      setIsClearingAlerts(false);
    }
  };

  const onClearPress = (): void => {
    confirmClearAlerts(alerts.length, () => void clearAlerts(), t);
  };

  const isEmpty = !alertsQuery.isLoading && !alertsQuery.error && filteredAlerts.length === 0;

  const scrollViewProps = {
    contentContainerStyle: [styles.content, { paddingTop: topInset + spacing.sm }],
    contentInsetAdjustmentBehavior: 'automatic' as const,
    style: { backgroundColor: colors.systemGroupedBackground },
  };
  const refreshControl = <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />;

  const titleRow = (
    <View style={styles.titleRow}>
      <AppText variant={TextVariant.LargeTitle}>{t('alerts.title')}</AppText>
      <Pressable
        accessibilityRole="button"
        disabled={!hasClearableAlerts || isClearingAlerts}
        hitSlop={10}
        onPress={onClearPress}
      >
        <AppText variant={TextVariant.Body} color={hasClearableAlerts && !isClearingAlerts ? colors.accent : colors.tertiaryLabel}>
          {t('alerts.clear')}
        </AppText>
      </Pressable>
    </View>
  );

  const alertList = (
    <>
      {alertsQuery.isLoading ? <StateCard text={t('alerts.loading')} /> : null}
      {alertsQuery.error ? <StateCard text={resolveAlertError(alertsQuery.error, t)} /> : null}
      {isEmpty ? <StateCard text={t('alerts.empty')} /> : null}

      <View style={styles.list}>
        {filteredAlerts.map((item) => (
          <AlertCard
            key={item.id}
            alert={item}
            isSelected={displayedAlert !== null && displayedAlert.id === item.id}
            isUnread={isAlertUnread(item, lastSeenAt)}
            language={i18n.language}
            onDelete={() => deleteAlertMutation.mutate(item.id)}
            onSelect={alertSelection.isSplit ? () => alertSelection.open(item.id) : undefined}
            t={t}
          />
        ))}
      </View>
    </>
  );

  const emptyAlertPane = isEmpty ? <EmptyAlertPane text={t('alerts.empty')} /> : null;

  const alertsColumn = (
    <ScrollView {...scrollViewProps} refreshControl={refreshControl}>
      {titleRow}
      <SegmentedControl<AlertFilter>
        value={activeFilter}
        onChange={setActiveFilter}
        options={Object.values(AlertFilter).map((filter) => ({ label: t(resolveFilterLabelKey(filter)), value: filter }))}
      />
      {alertList}
    </ScrollView>
  );

  return (
    <SplitPanes
      first={alertsColumn}
      second={
        displayedAlert ? (
          <ScrollView {...scrollViewProps}>
            <AlertDetailView key={displayedAlert.id} alert={displayedAlert} onDelete={() => deleteAlertMutation.mutate(displayedAlert.id)} />
          </ScrollView>
        ) : (
          emptyAlertPane
        )
      }
    />
  );
}

function EmptyAlertPane({ text }: { text: string }): JSX.Element {
  const colors = useThemeColors();

  return (
    <CenteredPane>
      <Icon name="bell.fill" size={44} color={colors.tertiaryLabel} />
      <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel} style={styles.stateText}>
        {text}
      </AppText>
    </CenteredPane>
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
  content: {
    ...readableContent,
    gap: spacing.lg,
    paddingBottom: spacing.xxl * 3,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
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
