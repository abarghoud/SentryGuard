import * as WebBrowser from 'expo-web-browser';
import type { JSX } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

import { useThemeColors } from '../core/theme';
import { DetailTile } from './vehicle-detail/components/DetailTile';
import { LockedSetting } from './vehicle-detail/components/LockedSetting';
import { PanelTitle } from './vehicle-detail/components/PanelTitle';
import { ToggleSetting } from './vehicle-detail/components/ToggleSetting';
import {
  confirmTelemetryDeletion,
  isBreakInOffensiveOn,
  openVirtualKey,
  resolveNextOffensiveResponse,
  resolveOffensiveResponseLabel,
} from './vehicle-detail/vehicle-detail.helpers';
import { createVehicleDetailStyles } from './vehicle-detail/vehicle-detail.styles';
import { VehicleAction } from './vehicle-detail/vehicle-detail.types';
import { useVehicleDetail } from './vehicle-detail/use-vehicle-detail';

interface VehicleDetailScreenProps {
  navigation: {
    goBack(): void;
  };
  route: {
    params: {
      vehicleId: string;
    };
  };
}

export function VehicleDetailScreen({ route, navigation }: VehicleDetailScreenProps): JSX.Element {
  const colors = useThemeColors();
  const styles = createVehicleDetailStyles(colors);
  const {
    actionMutation,
    feedback,
    isActionRunning,
    isBetaTester,
    scopeMutation,
    setFeedback,
    t,
    vehicle,
    vehicleCommandsAuthorized,
  } = useVehicleDetail(route.params.vehicleId);

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isProtected = vehicle.sentry_mode_monitoring_enabled || (isBetaTester && vehicle.break_in_monitoring_enabled);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </Pressable>
          <View style={[styles.statusBadge, isProtected ? styles.safeBadge : styles.warningBadge]}>
            <Text style={styles.statusText}>{isProtected ? t('common.protected') : t('common.toConfigure')}</Text>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.kicker}>{t('vehicle.kicker')}</Text>
          <Text style={styles.title}>{vehicle.display_name ?? vehicle.model ?? t('common.vehicleFallback')}</Text>
          <Text style={styles.subtitle}>{vehicle.vin}</Text>
        </View>

        <View style={styles.grid}>
          <DetailTile
            label={t('vehicle.sentrySection')}
            styles={styles}
            value={vehicle.sentry_mode_monitoring_enabled ? t('common.active') : t('common.inactive')}
          />
          <DetailTile label={t('vehicle.keyMobile')} styles={styles} value={vehicle.key_paired ? t('vehicle.keyPaired') : t('vehicle.keyUnpaired')} />
          {isBetaTester ? (
            <>
              <DetailTile
                label={t('vehicle.intrusionSection')}
                styles={styles}
                value={vehicle.break_in_monitoring_enabled ? t('common.active') : t('common.inactive')}
              />
              {vehicle.break_in_monitoring_enabled ? (
                <DetailTile label={t('vehicle.offensive')} styles={styles} value={resolveOffensiveResponseLabel(vehicle, t)} />
              ) : null}
            </>
          ) : null}
        </View>

        {!vehicle.key_paired ? (
          <LockedSetting
            description={t('vehicle.lockedKeyDescription')}
            disabled={false}
            label={t('vehicle.openTesla')}
            onPress={() => void openVirtualKey(setFeedback, t)}
            styles={styles}
            title={t('onboarding.virtualKeyTitle')}
          />
        ) : null}

        <View style={styles.actionsPanel}>
          <Text style={styles.panelTitle}>{t('vehicle.sentrySection')}</Text>
          <ToggleSetting
            description={
              vehicle.sentry_mode_monitoring_enabled
                ? t('vehicle.sentryEnabledDescription')
                : t('vehicle.sentryDisabledDescription')
            }
            disabled={isActionRunning}
            isOn={vehicle.sentry_mode_monitoring_enabled}
            label={t('vehicle.monitoring')}
            onToggle={() => {
              if (vehicle.sentry_mode_monitoring_enabled) {
                confirmTelemetryDeletion(() => actionMutation.mutate(VehicleAction.DeleteTelemetry), t);
                return;
              }

              actionMutation.mutate(VehicleAction.ConfigureTelemetry);
            }}
            styles={styles}
          />
        </View>

        {isBetaTester ? (
          <View style={styles.actionsPanel}>
            <PanelTitle isBeta styles={styles} title={t('vehicle.intrusionSection')} />
            <ToggleSetting
              description={
                vehicle.break_in_monitoring_enabled
                  ? t('vehicle.intrusionEnabledDescription')
                  : t('vehicle.intrusionDisabledDescription')
              }
              disabled={isActionRunning}
              isOn={vehicle.break_in_monitoring_enabled === true}
              label={t('vehicle.monitoring')}
              onToggle={() => actionMutation.mutate(VehicleAction.ToggleBreakIn)}
              styles={styles}
            />
            {vehicle.break_in_monitoring_enabled ? (
              vehicleCommandsAuthorized ? (
                <ToggleSetting
                  description={
                    isBreakInOffensiveOn(vehicle)
                      ? t('vehicle.offensiveEnabledDescription')
                      : t('vehicle.offensiveDisabledDescription')
                  }
                  disabled={isActionRunning}
                  isOn={isBreakInOffensiveOn(vehicle)}
                  label={t('vehicle.offensive')}
                  onToggle={() => actionMutation.mutate(resolveNextOffensiveResponse(vehicle))}
                  styles={styles}
                />
              ) : (
                <LockedSetting
                  description={t('vehicle.scopeDescription')}
                  disabled={scopeMutation.isPending}
                  label={scopeMutation.isPending ? t('vehicle.openingTesla') : t('vehicle.authorizeOffensive')}
                  onPress={() => scopeMutation.mutate()}
                  styles={styles}
                  title={t('vehicle.offensive')}
                />
              )
            ) : null}
          </View>
        ) : null}

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
