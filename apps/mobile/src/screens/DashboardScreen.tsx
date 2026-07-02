import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useScreenTopInset } from '../core/design/use-screen-inset';
import { useThemeColors } from '../core/theme';
import { AppText } from '../core/ui';
import { MainStackParamList } from '../core/navigation';
import { getOnboardingStatusUseCase } from '../features/onboarding/di';
import { useVehiclesQuery } from '../features/vehicles/di';
import { EmptyState } from './dashboard/components/EmptyState';
import { OnboardingBanner } from './dashboard/components/OnboardingBanner';
import { VehicleCard } from './dashboard/components/VehicleCard';
import { VirtualKeyBanner } from './dashboard/components/VirtualKeyBanner';
import { openVirtualKey, resolveSubtitle } from './dashboard/dashboard.helpers';

export function DashboardScreen(): JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [virtualKeyMessage, setVirtualKeyMessage] = useState<string | null>(null);
  const colors = useThemeColors();
  const topInset = useScreenTopInset();
  const vehiclesQuery = useVehiclesQuery();
  const onboardingQuery = useQuery({
    queryFn: () => getOnboardingStatusUseCase.execute(),
    queryKey: ['onboarding-status'],
  });
  const isOnboardingIncomplete = onboardingQuery.data?.isSkipped === true;

  return (
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
          <View style={styles.titleBlock}>
            <AppText variant={TextVariant.LargeTitle}>{t('dashboard.title')}</AppText>
            <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
              {resolveSubtitle(vehiclesQuery.data, t)}
            </AppText>
          </View>

          <OnboardingBanner
            isVisible={isOnboardingIncomplete}
            onResume={() => navigation.navigate('Onboarding')}
            t={t}
          />

          <VirtualKeyBanner
            message={virtualKeyMessage}
            t={t}
            vehicles={vehiclesQuery.data ?? []}
            onOpenKey={() => void openVirtualKey(setVirtualKeyMessage, t)}
          />
        </View>
      }
      ListEmptyComponent={<EmptyState isLoading={vehiclesQuery.isLoading} error={vehiclesQuery.error} t={t} />}
      renderItem={({ item }) => (
        <VehicleCard
          vehicle={item}
          onSelect={() => navigation.navigate('VehicleDetail', { vehicleId: item.vin, title: item.display_name ?? item.model })}
          t={t}
        />
      )}
    />
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
  separator: {
    height: spacing.md,
  },
  titleBlock: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
});
