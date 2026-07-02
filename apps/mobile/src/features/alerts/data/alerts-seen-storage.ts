import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const alertsSeenAtKey = 'sentryguard.alertsSeenAt';

export async function getStoredAlertsSeenAt(): Promise<string | null> {
  const value = Platform.OS === 'web'
    ? globalThis.localStorage?.getItem(alertsSeenAtKey) ?? null
    : await SecureStore.getItemAsync(alertsSeenAtKey);

  return isValidDate(value) ? value : null;
}

export async function storeAlertsSeenAt(seenAt: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(alertsSeenAtKey, seenAt);
    return;
  }

  await SecureStore.setItemAsync(alertsSeenAtKey, seenAt);
}

function isValidDate(value: string | null): value is string {
  return value !== null && !Number.isNaN(new Date(value).getTime());
}
