import * as Linking from 'expo-linking';

import { virtualKeyStore } from '../../core/api';
import { Vehicle } from '../../features/vehicles/domain/entities';

export type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

export async function openVirtualKey(setMessage: (message: string | null) => void, t: TranslationFunction): Promise<void> {
  const url = virtualKeyStore.resolveUrl();

  if (!url) {
    setMessage(t('onboarding.virtualKeyMissingUrl'));
    return;
  }

  await Linking.openURL(url);
  setMessage(t('onboarding.virtualKeyReturn'));
}

export function resolveVehicleName(vehicle: Vehicle, t: TranslationFunction): string {
  return vehicle.display_name ?? vehicle.model ?? t('common.vehicleFallback');
}

export function resolveError(error: unknown): string | null {
  return error instanceof Error ? error.message : null;
}
