import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useScreenTopInset } from '../core/design/use-screen-inset';
import { useThemeColors } from '../core/theme';
import { AppText, Icon } from '../core/ui';
import { MainStackParamList } from '../core/navigation';
import { usePushToken } from '../core/hooks/usePushToken';
import {
  getNotificationPreferencesUseCase,
  muteNotificationsUseCase,
  pushNotificationService,
  unmuteNotificationsUseCase,
  updateNotificationPreferencesUseCase,
} from '../features/notifications/di';
import { getOnboardingStatusUseCase } from '../features/onboarding/di';
import { useVehiclesQuery } from '../features/vehicles/di';
import { EmptyState } from './dashboard/components/EmptyState';
import { MuteDurationModal } from './dashboard/components/MuteDurationModal';
import { MutedBanner } from './dashboard/components/MutedBanner';
import { OnboardingBanner } from './dashboard/components/OnboardingBanner';
import { PushNotificationBanner } from './dashboard/components/PushNotificationBanner';
import { VehicleCard } from './dashboard/components/VehicleCard';
import { VirtualKeyBanner } from './dashboard/components/VirtualKeyBanner';
import { isMuteActive, openVirtualKey, resolveSubtitle } from './dashboard/dashboard.helpers';
import { registerDeviceForPush } from './settings/settings.helpers';

export function DashboardScreen(): JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [virtualKeyMessage, setVirtualKeyMessage] = useState<string | null>(null);
  const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
  const colors = useThemeColors();
  const topInset = useScreenTopInset();
  const vehiclesQuery = useVehiclesQuery();
  const queryClient = useQueryClient();
  const { isTokenResolved, pushToken } = usePushToken();

  const onboardingQuery = useQuery({
    queryFn: () => getOnboardingStatusUseCase.execute(),
    queryKey: ['onboarding-status'],
  });
  const isOnboardingIncomplete = onboardingQuery.data?.isSkipped === true;

  const pushSetupQuery = useQuery({
    queryKey: ['push-setup-completed'],
    queryFn: () => pushNotificationService.isPushSetupCompleted(),
  });

  const preferencesQuery = useQuery({
    enabled: !!pushToken,
    queryFn: () => getNotificationPreferencesUseCase.execute(pushToken ?? undefined),
    queryKey: ['notification-preferences', pushToken],
  });

  useEffect(() => {
    if (preferencesQuery.data?.push_enabled) {
      void pushNotificationService.setPushSetupCompleted(true).then(() => {
        void queryClient.invalidateQueries({ queryKey: ['push-setup-completed'] });
      });
    }
  }, [preferencesQuery.data?.push_enabled, queryClient]);

  const isPushBannerVisible =
    Platform.OS !== 'web' &&
    isTokenResolved &&
    pushSetupQuery.data === false &&
    !pushSetupQuery.isLoading &&
    (pushToken === null
      ? true
      : preferencesQuery.data?.push_enabled === false && !preferencesQuery.isLoading);

  const handleEnablePush = async () => {
    try {
      const token = await registerDeviceForPush(undefined, t);
      if (token) {
        await updateNotificationPreferencesUseCase.execute({ push_enabled: true }, token);
        await pushNotificationService.setPushSetupCompleted(true);
        void queryClient.invalidateQueries({ queryKey: ['push-setup-completed'] });
        void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      }
    } catch {
      // Ignore
    }
  };

  const isMuted = isMuteActive(preferencesQuery.data?.muted_until);

  const handleMute = async (minutes: number): Promise<void> => {
    try {
      await muteNotificationsUseCase.execute(minutes);
      setIsMuteModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    } catch {
      setIsMuteModalOpen(false);
    }
  };

  const handleResumeNotifications = async (): Promise<void> => {
    try {
      await unmuteNotificationsUseCase.execute();
      setIsMuteModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    } catch {
      setIsMuteModalOpen(false);
    }
  };

  const handleDismissPushBanner = async () => {
    try {
      if (pushToken) {
        await updateNotificationPreferencesUseCase.execute({ push_enabled: false }, pushToken);
      }
      await pushNotificationService.setPushSetupCompleted(true);
      void queryClient.invalidateQueries({ queryKey: ['push-setup-completed'] });
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    } catch {
      await pushNotificationService.setPushSetupCompleted(true);
      void queryClient.invalidateQueries({ queryKey: ['push-setup-completed'] });
    }
  };

  return (
    <>
    <FlatList
      style={{ backgroundColor: colors.systemGroupedBackground }}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.sm }]}
      contentInsetAdjustmentBehavior="automatic"
      data={vehiclesQuery.data ?? []}
      keyExtractor={(vehicle) => vehicle.id}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={<RefreshControl refreshing={vehiclesQuery.isFetching} onRefresh={() => void vehiclesQuery.refetch()} />}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <View style={styles.headerTitleRow}>
            <View style={styles.titleBlock}>
              <AppText variant={TextVariant.LargeTitle}>{t('dashboard.title')}</AppText>
              <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
                {resolveSubtitle(vehiclesQuery.data, t)}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isMuted ? t('dashboard.mutedBanner.resume') : t('dashboard.pauseAction')}
              onPress={() => setIsMuteModalOpen(true)}
              hitSlop={8}
              style={[styles.pauseButton, { backgroundColor: isMuted ? colors.warningSurface : colors.fill }]}
            >
              {({ pressed }) => (
                <View style={[styles.pauseButtonInner, pressed ? styles.pressed : null]}>
                  <Icon
                    name="bell.slash.fill"
                    size={16}
                    color={isMuted ? colors.warningBorder : colors.secondaryLabel}
                  />
                  <AppText
                    variant={TextVariant.Caption1}
                    color={isMuted ? colors.warningBorder : colors.secondaryLabel}
                    style={styles.pauseButtonText}
                  >
                    {isMuted ? t('dashboard.mutedBanner.resume') : t('dashboard.pauseAction')}
                  </AppText>
                </View>
              )}
            </Pressable>
          </View>

          <MutedBanner
            isVisible={isMuted}
            mutedUntil={preferencesQuery.data?.muted_until}
            onResume={() => void handleResumeNotifications()}
            t={t}
          />

          <OnboardingBanner
            isVisible={isOnboardingIncomplete}
            onResume={() => navigation.navigate('Onboarding')}
            t={t}
          />

          <VirtualKeyBanner
            t={t}
            vehicles={vehiclesQuery.data ?? []}
            onOpenKey={() => void openVirtualKey(setVirtualKeyMessage, t)}
          />

          <PushNotificationBanner
            isVisible={isPushBannerVisible}
            onEnable={handleEnablePush}
            onDismiss={handleDismissPushBanner}
            t={t}
          />

          {virtualKeyMessage ? (
            <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
              {virtualKeyMessage}
            </AppText>
          ) : null}
        </View>
      }
      ListEmptyComponent={<EmptyState isLoading={vehiclesQuery.isLoading} error={vehiclesQuery.error} t={t} />}
      renderItem={({ item }) => (
        <VehicleCard
          vehicle={item}
          onOpenKey={() => void openVirtualKey(setVirtualKeyMessage, t)}
          onSelect={() => navigation.navigate('VehicleDetail', { vehicleId: item.vin, title: item.display_name ?? item.model })}
          t={t}
        />
      )}
    />
    <MuteDurationModal
      isVisible={isMuteModalOpen}
      mutedUntil={preferencesQuery.data?.muted_until}
      onClose={() => setIsMuteModalOpen(false)}
      onMute={(minutes) => void handleMute(minutes)}
      onResume={() => void handleResumeNotifications()}
      t={t}
    />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl * 3,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
  headerBlock: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pauseButton: {
    borderRadius: 999,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  pauseButtonInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pauseButtonText: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
  separator: {
    height: spacing.md,
  },
  titleBlock: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
});
