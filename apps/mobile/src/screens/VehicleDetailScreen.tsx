import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

import { ThemeColors, useThemeColors } from '../core/theme';
import {
  configureTelemetry,
  deleteTelemetryConfig,
  getVehicles,
  OffensiveResponse,
  toggleBreakInMonitoring,
  updateOffensiveResponse,
  type Vehicle,
  type VehicleActionResponse,
} from '../services/api/vehicles-api';
import { getAuthProfile, getTeslaScopeChangeUrl, getVehicleCommandsAuthorization } from '../services/api/auth-api';
import { storeToken } from '../services/session/token-storage';
import { setAccessToken } from '../services/api/token-state';
import { resolveVirtualKeyUrl } from '../services/api/virtual-key';

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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const vehiclesQuery = useQuery({
    queryFn: getVehicles,
    queryKey: ['vehicles'],
  });
  const profileQuery = useQuery({
    queryFn: getAuthProfile,
    queryKey: ['auth-profile'],
  });
  const vehicleCommandsQuery = useQuery({
    enabled: profileQuery.data?.profile.isBetaTester === true,
    queryFn: getVehicleCommandsAuthorization,
    queryKey: ['auth', 'vehicle-commands-authorized'],
    staleTime: 5 * 60 * 1000,
  });
  const vehicle = vehiclesQuery.data?.find((cachedVehicle) => cachedVehicle.vin === route.params.vehicleId);
  const isBetaTester = profileQuery.data?.profile.isBetaTester === true;

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
  const actionMutation = useMutation<VehicleActionResponse, Error, VehicleMutationAction>({
    mutationFn: async (action: VehicleMutationAction): Promise<VehicleActionResponse> => {
      if (action === VehicleAction.ConfigureTelemetry) {
        return resolveTelemetryConfigurationResponse(await configureTelemetry(vehicle.vin), t);
      }

      if (action === VehicleAction.DeleteTelemetry) {
        return resolveSuccessfulResponse(await deleteTelemetryConfig(vehicle.vin), t);
      }

      if (action === VehicleAction.ToggleBreakIn) {
        return resolveSuccessfulResponse(
          await toggleBreakInMonitoring(vehicle.vin, !vehicle.break_in_monitoring_enabled),
          t
        );
      }

      return resolveSuccessfulResponse(await updateOffensiveResponse(vehicle.vin, action), t);
    },
    onError: (error: Error) => {
      setFeedback(error.message);
    },
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
  const scopeMutation = useMutation({
    mutationFn: () => requestVehicleCommandsScope(t),
    onError: (error: Error) => setFeedback(error.message),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'vehicle-commands-authorized'] });
      setFeedback(null);
    },
  });

  const isActionRunning = actionMutation.isPending;

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
          label={t('vehicle.alertSentry')}
          styles={styles}
          value={vehicle.sentry_mode_monitoring_enabled ? t('common.active') : t('common.inactive')}
        />
        <DetailTile label={t('vehicle.keyMobile')} styles={styles} value={vehicle.key_paired ? t('vehicle.keyPaired') : t('vehicle.keyUnpaired')} />
        {isBetaTester ? (
          <>
            <DetailTile
              label={t('vehicle.alertIntrusion')}
              styles={styles}
              value={vehicle.break_in_monitoring_enabled ? t('common.active') : t('common.inactive')}
            />
            {vehicle.break_in_monitoring_enabled ? (
              <DetailTile label={t('vehicle.offensive')} styles={styles} value={resolveOffensiveResponseLabel(vehicle, t)} />
            ) : null}
          </>
        ) : null}
      </View>

      <View style={styles.actionsPanel}>
        <Text style={styles.panelTitle}>{t('vehicle.actions')}</Text>
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
        <ToggleSetting
          description={
            vehicle.sentry_mode_monitoring_enabled
              ? t('vehicle.sentryEnabledDescription')
              : t('vehicle.sentryDisabledDescription')
          }
          disabled={isActionRunning}
          isOn={vehicle.sentry_mode_monitoring_enabled}
          label={t('vehicle.alertSentry')}
          onToggle={() => {
            if (vehicle.sentry_mode_monitoring_enabled) {
                  confirmTelemetryDeletion(() => actionMutation.mutate(VehicleAction.DeleteTelemetry), t);
              return;
            }

            actionMutation.mutate(VehicleAction.ConfigureTelemetry);
          }}
          styles={styles}
        />
        {isBetaTester ? (
          <View style={styles.settingGroup}>
            <ToggleSetting
              description={
                vehicle.break_in_monitoring_enabled
                  ? t('vehicle.intrusionEnabledDescription')
                  : t('vehicle.intrusionDisabledDescription')
              }
              disabled={isActionRunning}
              isOn={vehicle.break_in_monitoring_enabled === true}
              label={t('vehicle.alertIntrusion')}
              onToggle={() => actionMutation.mutate(VehicleAction.ToggleBreakIn)}
              styles={styles}
            />
            {vehicle.break_in_monitoring_enabled ? (
              <View style={styles.nestedSetting}>
                {vehicleCommandsQuery.data?.authorized ? (
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
                )}
              </View>
            ) : null}
          </View>
        ) : null}
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

async function requestVehicleCommandsScope(t: TranslationFunction): Promise<void> {
  const redirectUri = Linking.createURL('callback');
  const login = await getTeslaScopeChangeUrl(['vehicle_cmds'], redirectUri);
  const result = await WebBrowser.openAuthSessionAsync(login.url, redirectUri);
  const token = result.type === 'success' ? extractTokenFromCallbackUrl(result.url) : null;

  if (!token) {
    throw new Error(t('vehicle.scopeCancelled'));
  }

  await storeToken(token);
  setAccessToken(token);
}

async function openVirtualKey(setMessage: (message: string | null) => void, t: TranslationFunction): Promise<void> {
  const url = resolveVirtualKeyUrl();

  if (!url) {
    setMessage(t('dashboard.virtualKey.missingUrl'));
    return;
  }

  await Linking.openURL(url);
  setMessage(t('vehicle.virtualKeyMessage'));
}

function extractTokenFromCallbackUrl(callbackUrl: string): string | null {
  const parsedUrl = Linking.parse(callbackUrl);
  const token = parsedUrl.queryParams?.token;

  if (typeof token === 'string') {
    return token;
  }

  const hashToken = callbackUrl.match(/[#&]token=([^&]+)/)?.[1];
  return hashToken ? decodeURIComponent(hashToken) : null;
}

enum VehicleAction {
  ConfigureTelemetry = 'ConfigureTelemetry',
  DeleteTelemetry = 'DeleteTelemetry',
  ToggleBreakIn = 'ToggleBreakIn',
}

type VehicleMutationAction = OffensiveResponse | VehicleAction;

function isBreakInOffensiveOn(vehicle: Vehicle): boolean {
  return vehicle.break_in_offensive_response === OffensiveResponse.Honk;
}

function resolveNextOffensiveResponse(vehicle: Vehicle): OffensiveResponse {
  return isBreakInOffensiveOn(vehicle) ? OffensiveResponse.Disabled : OffensiveResponse.Honk;
}

function resolveOffensiveResponseLabel(vehicle: Vehicle, t: TranslationFunction): string {
  return isBreakInOffensiveOn(vehicle) ? t('vehicle.honkActive') : t('vehicle.honkDisabled');
}

function resolveSuccessfulResponse(response: VehicleActionResponse, t: TranslationFunction): VehicleActionResponse {
  if (response.success === false) {
    throw new Error(response.message || t('vehicle.actionRefused'));
  }

  return response;
}

function resolveTelemetryConfigurationResponse(response: VehicleActionResponse, t: TranslationFunction): VehicleActionResponse {
  const skippedVehicle = response.result?.skippedVehicle ?? null;
  const isSuccess = response.result?.success === true && !skippedVehicle;

  if (isSuccess) {
    return { ...response, message: response.message || t('vehicle.sentryActivated') };
  }

  if (skippedVehicle) {
    throw new Error(formatSkippedReason(skippedVehicle.reason, t, skippedVehicle.details));
  }

  throw new Error(response.message || t('vehicle.sentryActivationFailed'));
}

function formatSkippedReason(reason: string, t: TranslationFunction, details?: string): string {
  if (reason === 'missing_key') {
    return t('vehicle.reason.missingKey');
  }

  if (reason === 'unsupported_hardware') {
    return t('vehicle.reason.unsupportedHardware');
  }

  if (reason === 'unsupported_firmware') {
    return t('vehicle.reason.unsupportedFirmware');
  }

  if (reason === 'max_configs') {
    return t('vehicle.reason.maxConfigs');
  }

  return details ? t('vehicle.reason.withDetails', { details }) : t('vehicle.reason.unknown');
}

function confirmTelemetryDeletion(onConfirm: () => void, t: TranslationFunction): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(t('vehicle.confirmDisable'))) {
      onConfirm();
    }

    return;
  }

  Alert.alert(
    t('vehicle.disableTitle'),
    t('vehicle.confirmDisable'),
    [
      { text: t('vehicle.cancel'), style: 'cancel' },
      { text: t('vehicle.disable'), style: 'destructive', onPress: onConfirm },
    ]
  );
}

type VehicleDetailStyles = ReturnType<typeof createStyles>;

function DetailTile({ label, styles, value }: { label: string; styles: VehicleDetailStyles; value: string }): JSX.Element {
  return (
    <View style={styles.detailTile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function ToggleSetting({
  disabled,
  description,
  isOn,
  label,
  onToggle,
  styles,
}: {
  disabled: boolean;
  description: string;
  isOn: boolean;
  label: string;
  onToggle(): void;
  styles: VehicleDetailStyles;
}): JSX.Element {
  return (
    <View style={styles.togglePanel}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isOn }}
        disabled={disabled}
        onPress={onToggle}
        style={[
          styles.toggleTrack,
          isOn ? styles.toggleTrackOn : styles.toggleTrackOff,
          disabled ? styles.disabledAction : null,
        ]}
      >
        <View style={[styles.toggleThumb, isOn ? styles.toggleThumbOn : styles.toggleThumbOff]} />
      </Pressable>
    </View>
  );
}

function LockedSetting({
  description,
  disabled,
  label,
  onPress,
  styles,
  title,
}: {
  description: string;
  disabled: boolean;
  label: string;
  onPress(): void;
  styles: VehicleDetailStyles;
  title: string;
}): JSX.Element {
  return (
    <View style={styles.lockedPanel}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Pressable disabled={disabled} onPress={onPress} style={[styles.lockedButton, disabled ? styles.disabledAction : null]}>
        <Text style={styles.lockedButtonText}>{label}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    actionsPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 10,
      padding: 16,
    },
    backButton: {
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    backButtonText: {
      color: colors.text,
      fontWeight: '800',
    },
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      gap: 16,
      paddingBottom: 20,
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    detailTile: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 6,
      padding: 14,
      width: '48%',
    },
    disabledAction: {
      opacity: 0.55,
    },
    feedback: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
    },
    loadingContainer: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    loadingText: {
      color: colors.muted,
    },
    lockedButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 10,
    },
    lockedPanel: {
      backgroundColor: colors.panel,
      borderRadius: 8,
      gap: 10,
      padding: 14,
    },
    lockedButtonText: {
      color: colors.accentText,
      fontSize: 12,
      fontWeight: '900',
      textAlign: 'center',
    },
    nestedSetting: {
      borderLeftColor: colors.border,
      borderLeftWidth: 2,
      marginLeft: 12,
      paddingLeft: 10,
    },
    toggleCopy: {
      flex: 1,
      gap: 4,
    },
    toggleDescription: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    togglePanel: {
      alignItems: 'center',
      backgroundColor: colors.panel,
      borderRadius: 8,
      flexDirection: 'row',
      gap: 14,
      justifyContent: 'space-between',
      padding: 14,
    },
    toggleTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '900',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'space-between',
    },
    header: {
      gap: 6,
    },
    kicker: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    panelTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    safeBadge: {
      backgroundColor: colors.accent,
    },
    settingGroup: {
      gap: 10,
    },
    statusBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    statusText: {
      color: colors.accentText,
      fontSize: 12,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 13,
    },
    tileLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    tileValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
    },
    toggleThumb: {
      backgroundColor: colors.accentText,
      borderRadius: 10,
      height: 20,
      width: 20,
    },
    toggleThumbOff: {
      backgroundColor: colors.muted,
      transform: [{ translateX: 2 }],
    },
    toggleThumbOn: {
      transform: [{ translateX: 24 }],
    },
    toggleTrack: {
      borderRadius: 14,
      height: 28,
      justifyContent: 'center',
      width: 48,
    },
    toggleTrackOff: {
      backgroundColor: colors.border,
    },
    toggleTrackOn: {
      backgroundColor: colors.control,
    },
    title: {
      color: colors.text,
      fontSize: 32,
      fontWeight: '900',
    },
    topBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    warningBadge: {
      backgroundColor: colors.warning,
    },
  });
}
