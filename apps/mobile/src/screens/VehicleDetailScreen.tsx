import * as WebBrowser from 'expo-web-browser';
import type { JSX } from 'react';
import { useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

import { screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useThemeColors } from '../core/theme';
import { AppSwitch, AppText, GlassButton, GlassButtonVariant, Icon, ListRow, ListSection, SegmentedControl, Surface } from '../core/ui';
import {
  confirmTelemetryDeletion,
  openVirtualKey,
} from './vehicle-detail/vehicle-detail.helpers';
import { OffensiveResponse } from '../features/vehicles/domain/entities';
import { VehicleAction } from './vehicle-detail/vehicle-detail.types';
import { useVehicleDetail } from './vehicle-detail/use-vehicle-detail';
import type { VehicleDetailScreenProps } from '../core/navigation';

export function VehicleDetailScreen({ route, navigation }: VehicleDetailScreenProps): JSX.Element {
  const colors = useThemeColors();
  const {
    actionMutation,
    feedback,
    isActionRunning,
    scopeMutation,
    setFeedback,
    t,
    vehicle,
    vehicleCommandsAuthorized,
  } = useVehicleDetail(route.params.vehicleId);

  const headerTitle = vehicle?.display_name ?? vehicle?.model ?? t('common.vehicleFallback');
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: true, title: headerTitle });
  }, [navigation, headerTitle]);

  if (!vehicle) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.systemGroupedBackground }]}>
        <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
          {t('common.loading')}
        </AppText>
      </View>
    );
  }

  const isProtected = vehicle.sentry_mode_monitoring_enabled || vehicle.break_in_monitoring_enabled;
  const statusSurface = isProtected ? colors.successFill : colors.fill;
  const statusGlyph = isProtected ? colors.onSuccess : colors.secondaryLabel;

  return (
    <ScrollView
      style={{ backgroundColor: colors.systemGroupedBackground }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Surface style={styles.statusCard}>
        <View style={[styles.statusIcon, { backgroundColor: statusSurface }]}>
          <Icon name={isProtected ? 'checkmark.shield.fill' : 'exclamationmark.shield.fill'} size={22} color={statusGlyph} />
        </View>
        <View style={styles.statusText}>
          <AppText variant={TextVariant.Headline}>{isProtected ? t('common.protected') : t('common.toConfigure')}</AppText>
          <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
            {vehicle.vin}
          </AppText>
        </View>
      </Surface>

      {!vehicle.key_paired ? (
        <Surface style={styles.lockedCard}>
          <AppText variant={TextVariant.Headline}>{t('onboarding.virtualKeyTitle')}</AppText>
          <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
            {t('vehicle.lockedKeyDescription')}
          </AppText>
          <GlassButton label={t('vehicle.openTesla')} icon="arrow.up.right.square" variant={GlassButtonVariant.Secondary} onPress={() => void openVirtualKey(setFeedback, t)} />
        </Surface>
      ) : null}

      <ListSection header={t('vehicle.sentrySection')}>
        <ListRow
          title={t('vehicle.monitoring')}
          subtitle={vehicle.sentry_mode_monitoring_enabled ? t('vehicle.sentryEnabledDescription') : t('vehicle.sentryDisabledDescription')}
          accessory={
            <AppSwitch
              accessibilityLabel={t('vehicle.alertSentry')}
              disabled={isActionRunning}
              value={vehicle.sentry_mode_monitoring_enabled}
              onValueChange={() => {
                if (vehicle.sentry_mode_monitoring_enabled) {
                  confirmTelemetryDeletion(() => actionMutation.mutate(VehicleAction.DeleteTelemetry), t);
                  return;
                }

                actionMutation.mutate(VehicleAction.ConfigureTelemetry);
              }}
            />
          }
        />
      </ListSection>

      <ListSection header={t('vehicle.intrusionSection')} badge={t('common.beta')}>
        <ListRow
          title={t('vehicle.monitoring')}
          subtitle={vehicle.break_in_monitoring_enabled ? t('vehicle.intrusionEnabledDescription') : t('vehicle.intrusionDisabledDescription')}
          accessory={
            <AppSwitch
              accessibilityLabel={t('vehicle.alertIntrusion')}
              disabled={isActionRunning}
              value={vehicle.break_in_monitoring_enabled === true}
              onValueChange={() => actionMutation.mutate(VehicleAction.ToggleBreakIn)}
            />
          }
        />
        {vehicle.break_in_monitoring_enabled && vehicleCommandsAuthorized ? (
          <View style={styles.offensiveRow}>
            <AppText variant={TextVariant.Body}>{t('vehicle.offensive')}</AppText>
            <SegmentedControl
              value={(vehicle.break_in_offensive_response as OffensiveResponse) ?? OffensiveResponse.Disabled}
              onChange={(value) => actionMutation.mutate(value)}
              options={[
                { label: t('vehicle.offensiveDisabled'), value: OffensiveResponse.Disabled },
                { label: t('vehicle.offensiveHonk'), value: OffensiveResponse.Honk },
                { label: t('vehicle.offensiveFart'), value: OffensiveResponse.Fart },
              ]}
            />
            <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
              {vehicle.break_in_offensive_response === OffensiveResponse.Honk
                ? t('vehicle.offensiveEnabledDescription')
                : vehicle.break_in_offensive_response === OffensiveResponse.Fart
                ? t('vehicle.offensiveFartEnabledDescription')
                : t('vehicle.offensiveDisabledDescription')}
            </AppText>
          </View>
        ) : null}
      </ListSection>

      {vehicle.break_in_monitoring_enabled && !vehicleCommandsAuthorized ? (
        <Surface style={styles.lockedCard}>
          <AppText variant={TextVariant.Headline}>{t('vehicle.offensive')}</AppText>
          <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
            {t('vehicle.scopeDescription')}
          </AppText>
          <GlassButton
            label={scopeMutation.isPending ? t('vehicle.openingTesla') : t('vehicle.authorizeOffensive')}
            disabled={scopeMutation.isPending}
            onPress={() => scopeMutation.mutate()}
          />
        </Surface>
      ) : null}

      {feedback ? (
        <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel} style={styles.feedback}>
          {feedback}
        </AppText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
  },
  feedback: {
    paddingHorizontal: spacing.xs,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  lockedCard: {
    gap: spacing.md,
  },
  offensiveRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  statusCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  statusIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  statusText: {
    flex: 1,
    gap: 2,
  },
});
