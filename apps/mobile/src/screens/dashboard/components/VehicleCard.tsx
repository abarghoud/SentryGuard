import type { JSX } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Vehicle } from '../../../features/vehicles/domain/entities';
import { TranslationFunction, isVehicleProtected } from '../dashboard.helpers';
import { DashboardStyles } from '../dashboard.styles';
import { Metric } from './Metric';

export function VehicleCard({
  isBetaTester,
  onSelect,
  styles,
  t,
  vehicle,
}: {
  isBetaTester: boolean;
  onSelect(): void;
  styles: DashboardStyles;
  t: TranslationFunction;
  vehicle: Vehicle;
}): JSX.Element {
  const isProtected = isVehicleProtected(vehicle, isBetaTester);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.vehicleName}>{vehicle.display_name ?? vehicle.model ?? t('common.vehicleFallback')}</Text>
          <Text style={styles.vin}>{vehicle.vin}</Text>
        </View>
        <View style={[styles.statusBadge, isProtected ? styles.safeBadge : styles.warningBadge]}>
          <Text style={styles.statusText}>{isProtected ? t('common.protected') : t('common.toConfigure')}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric label={t('vehicle.alertSentry')} styles={styles} value={vehicle.sentry_mode_monitoring_enabled ? t('common.active') : t('common.inactive')} />
        {isBetaTester ? (
          <Metric label={t('vehicle.alertIntrusion')} styles={styles} value={vehicle.break_in_monitoring_enabled ? t('common.active') : t('common.inactive')} />
        ) : null}
      </View>

      <Pressable accessibilityRole="button" style={styles.cardAction} onPress={onSelect}>
        <Text style={styles.cardActionText}>{t('dashboard.details')}</Text>
      </Pressable>
    </View>
  );
}
