import type { JSX } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText, Icon, Surface, VinMask } from '../../../core/ui';
import { Vehicle } from '../../../features/vehicles/domain/entities';
import { TranslationFunction, isVehicleProtected } from '../dashboard.helpers';

export function VehicleCard({
  onOpenKey,
  onSelect,
  t,
  vehicle,
}: {
  onOpenKey(): void;
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
              isActive={vehicle.sentry_mode_monitoring_enabled}
              label={t('vehicle.alertSentry')}
              value={vehicle.sentry_mode_monitoring_enabled ? t('common.active') : t('common.inactive')}
            />
            <Metric
              isActive={vehicle.break_in_monitoring_enabled === true}
              label={t('vehicle.alertIntrusion')}
              value={vehicle.break_in_monitoring_enabled ? t('common.active') : t('common.inactive')}
            />
          </View>

          {vehicle.key_paired === false ? (
            <Pressable
              accessibilityRole="button"
              onPress={onOpenKey}
              style={[styles.keyWarning, { backgroundColor: colors.warningSurface, borderColor: colors.warningBorder }]}
            >
              <Icon name="key.fill" size={16} color={colors.secondaryLabel} />
              <AppText variant={TextVariant.Footnote} style={styles.keyWarningText}>
                {t('dashboard.virtualKey.cardMissing')}
              </AppText>
              <Icon name="arrow.up.right.square" size={14} color={colors.secondaryLabel} />
            </Pressable>
          ) : null}

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

function Metric({ isActive, label, value }: { isActive: boolean; label: string; value: string }): JSX.Element {
  const colors = useThemeColors();
  const statusColor = isActive ? colors.systemGreen : colors.secondaryLabel;

  return (
    <View style={[styles.metric, { backgroundColor: isActive ? colors.successSurface : colors.fill }]}>
      <AppText variant={TextVariant.Caption1} color={colors.secondaryLabel}>
        {label}
      </AppText>
      <View style={styles.metricStatus}>
        <View style={[styles.metricDot, { backgroundColor: statusColor }]} />
        <AppText variant={TextVariant.Subhead} color={statusColor} style={styles.metricValue}>
          {value}
        </AppText>
      </View>
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
  keyWarning: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  keyWarningText: {
    flex: 1,
  },
  metric: {
    borderRadius: 12,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  metricDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  metricStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  metricValue: {
    fontWeight: '600',
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
