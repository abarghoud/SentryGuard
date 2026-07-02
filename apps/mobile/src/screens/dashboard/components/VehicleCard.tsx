import type { JSX } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText, Icon, Surface, VinMask } from '../../../core/ui';
import { Vehicle } from '../../../features/vehicles/domain/entities';
import { TranslationFunction, isVehicleProtected } from '../dashboard.helpers';

export function VehicleCard({
  onSelect,
  t,
  vehicle,
}: {
  onSelect(): void;
  t: TranslationFunction;
  vehicle: Vehicle;
}): JSX.Element {
  const colors = useThemeColors();
  const isProtected = isVehicleProtected(vehicle);
  const badgeSurface = isProtected ? colors.successSurface : colors.fill;
  const badgeLabel = isProtected ? colors.systemGreen : colors.label;

  return (
    <Pressable accessibilityRole="button" onPress={onSelect}>
      {({ pressed }) => (
        <Surface elevated style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <AppText variant={TextVariant.Headline}>{vehicle.display_name ?? vehicle.model ?? t('common.vehicleFallback')}</AppText>
              <VinMask vin={vehicle.vin} />
            </View>
            <View style={[styles.badge, { backgroundColor: badgeSurface }]}>
              <AppText variant={TextVariant.Caption1} color={badgeLabel} style={styles.badgeText}>
                {isProtected ? t('common.protected') : t('common.toConfigure')}
              </AppText>
            </View>
          </View>

          <View style={styles.metrics}>
            <Metric
              label={t('vehicle.alertSentry')}
              value={vehicle.sentry_mode_monitoring_enabled ? t('common.active') : t('common.inactive')}
            />
            <Metric
              label={t('vehicle.alertIntrusion')}
              value={vehicle.break_in_monitoring_enabled ? t('common.active') : t('common.inactive')}
            />
          </View>

          <View style={styles.footer}>
            <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
              {t('dashboard.details')}
            </AppText>
            <Icon name="chevron.right" size={14} color={colors.secondaryLabel} weight="semibold" />
          </View>
          {pressed ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.pressedOverlay }]} /> : null}
        </Surface>
      )}
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  const colors = useThemeColors();

  return (
    <View style={[styles.metric, { backgroundColor: colors.fill }]}>
      <AppText variant={TextVariant.Caption1} color={colors.secondaryLabel}>
        {label}
      </AppText>
      <AppText variant={TextVariant.Subhead}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  badgeText: {
    fontWeight: '700',
  },
  card: {
    gap: spacing.lg,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  metric: {
    borderRadius: 12,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
});
