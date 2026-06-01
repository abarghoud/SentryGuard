import * as Linking from 'expo-linking';

import { virtualKeyStore } from '../../core/api';
import { Vehicle } from '../../features/vehicles/domain/entities';

export type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

export function isVehicleProtected(vehicle: Vehicle, isBetaTester: boolean): boolean {
  return vehicle.sentry_mode_monitoring_enabled || (isBetaTester && vehicle.break_in_monitoring_enabled === true);
}

export function resolveSubtitle(vehicles: Vehicle[] | undefined, isBetaTester: boolean, t: TranslationFunction): string {
  if (!vehicles) {
    return t('dashboard.subtitleLoading');
  }

  const protectedVehicles = vehicles.filter((vehicle) => isVehicleProtected(vehicle, isBetaTester)).length;

  return t('dashboard.subtitleReady', { protectedCount: protectedVehicles, total: vehicles.length });
}

export async function openVirtualKey(setMessage: (message: string | null) => void, t: TranslationFunction): Promise<void> {
  const url = virtualKeyStore.resolveUrl();

  if (!url) {
    setMessage(t('dashboard.virtualKey.missingUrl'));
    return;
  }

  await Linking.openURL(url);
  setMessage(t('dashboard.virtualKey.message'));
}
