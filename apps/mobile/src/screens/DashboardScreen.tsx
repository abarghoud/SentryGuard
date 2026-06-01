import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { useThemeColors } from '../core/theme';
import { Vehicle } from '../features/vehicles/domain/entities';
import { useVehiclesQuery } from '../features/vehicles/di';
import { EmptyState } from './dashboard/components/EmptyState';
import { SummaryTile } from './dashboard/components/SummaryTile';
import { VehicleCard } from './dashboard/components/VehicleCard';
import { VirtualKeyBanner } from './dashboard/components/VirtualKeyBanner';
import { countProtectedVehicles, countUnprotectedVehicles, openVirtualKey, resolveSubtitle } from './dashboard/dashboard.helpers';
import { createDashboardStyles } from './dashboard/dashboard.styles';

interface DashboardScreenProps {
  isBetaTester?: boolean;
  onSelectVehicle(vehicle: Vehicle): void;
}

export function DashboardScreen({ isBetaTester = false, onSelectVehicle }: DashboardScreenProps): JSX.Element {
  const { t } = useTranslation();
  const [virtualKeyMessage, setVirtualKeyMessage] = useState<string | null>(null);
  const colors = useThemeColors();
  const styles = createDashboardStyles(colors);
  const vehiclesQuery = useVehiclesQuery();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{t('dashboard.kicker')}</Text>
        <Text style={styles.title}>{t('dashboard.title')}</Text>
        <Text style={styles.subtitle}>{resolveSubtitle(vehiclesQuery.data, isBetaTester, t)}</Text>
      </View>

      <VirtualKeyBanner
        message={virtualKeyMessage}
        styles={styles}
        t={t}
        vehicles={vehiclesQuery.data ?? []}
        onOpenKey={() => void openVirtualKey(setVirtualKeyMessage, t)}
      />

      <View style={styles.summaryRow}>
        <SummaryTile
          label={t('dashboard.monitored')}
          styles={styles}
          value={String(countProtectedVehicles(vehiclesQuery.data, isBetaTester))}
          tone={colors.accent}
        />
        <SummaryTile
          label={t('dashboard.configure')}
          styles={styles}
          value={String(countUnprotectedVehicles(vehiclesQuery.data, isBetaTester))}
          tone={colors.warning}
        />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={vehiclesQuery.data ?? []}
        keyExtractor={(vehicle) => vehicle.id}
        ListEmptyComponent={<EmptyState isLoading={vehiclesQuery.isLoading} error={vehiclesQuery.error} styles={styles} t={t} />}
        refreshControl={<RefreshControl refreshing={vehiclesQuery.isFetching} onRefresh={() => void vehiclesQuery.refetch()} />}
        renderItem={({ item }) => (
          <VehicleCard isBetaTester={isBetaTester} vehicle={item} onSelect={() => onSelectVehicle(item)} styles={styles} t={t} />
        )}
      />
    </View>
  );
}
