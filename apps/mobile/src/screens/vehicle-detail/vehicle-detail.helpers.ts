import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { tokenStore, virtualKeyStore } from '../../core/api';
import { getTeslaScopeChangeUrlUseCase } from '../../features/auth/di';
import { OffensiveResponse, Vehicle, VehicleActionResponse } from '../../features/vehicles/domain/entities';
import { TranslationFunction } from './vehicle-detail.types';

export function isBreakInOffensiveOn(vehicle: Vehicle): boolean {
  return vehicle.break_in_offensive_response === OffensiveResponse.Honk;
}

export function resolveNextOffensiveResponse(vehicle: Vehicle): OffensiveResponse {
  return isBreakInOffensiveOn(vehicle) ? OffensiveResponse.Disabled : OffensiveResponse.Honk;
}

export function resolveOffensiveResponseLabel(vehicle: Vehicle, t: TranslationFunction): string {
  return isBreakInOffensiveOn(vehicle) ? t('vehicle.honkActive') : t('vehicle.honkDisabled');
}

export function resolveSuccessfulResponse(response: VehicleActionResponse, t: TranslationFunction): VehicleActionResponse {
  if (response.success === false) {
    throw new Error(response.message || t('vehicle.actionRefused'));
  }

  return response;
}

export function resolveTelemetryConfigurationResponse(
  response: VehicleActionResponse,
  t: TranslationFunction
): VehicleActionResponse {
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

export function confirmTelemetryDeletion(onConfirm: () => void, t: TranslationFunction): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(t('vehicle.confirmDisable'))) {
      onConfirm();
    }

    return;
  }

  Alert.alert(t('vehicle.disableTitle'), t('vehicle.confirmDisable'), [
    { text: t('vehicle.cancel'), style: 'cancel' },
    { text: t('vehicle.disable'), style: 'destructive', onPress: onConfirm },
  ]);
}

export async function requestVehicleCommandsScope(t: TranslationFunction): Promise<void> {
  const redirectUri = Linking.createURL('callback');
  const login = await getTeslaScopeChangeUrlUseCase.execute(['vehicle_cmds'], redirectUri);
  const result = await WebBrowser.openAuthSessionAsync(login.url, redirectUri);
  const token = result.type === 'success' ? extractTokenFromCallbackUrl(result.url) : null;

  if (!token) {
    throw new Error(t('vehicle.scopeCancelled'));
  }

  await tokenStore.store(token);
}

export async function openVirtualKey(setMessage: (message: string | null) => void, t: TranslationFunction): Promise<void> {
  const url = virtualKeyStore.resolveUrl();

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
