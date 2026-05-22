import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const apiUrlKey = 'sentryguard.apiUrl';
const virtualKeyPairingUrlKey = 'sentryguard.virtualKeyPairingUrl';

export async function getStoredApiUrl(): Promise<string | null> {
  return Platform.OS === 'web'
    ? globalThis.localStorage?.getItem(apiUrlKey) ?? null
    : await SecureStore.getItemAsync(apiUrlKey);
}

export async function storeApiUrl(apiUrl: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(apiUrlKey, apiUrl);
    return;
  }

  await SecureStore.setItemAsync(apiUrlKey, apiUrl);
}

export async function removeStoredApiUrl(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(apiUrlKey);
    return;
  }

  await SecureStore.deleteItemAsync(apiUrlKey);
}

export async function getStoredVirtualKeyPairingUrl(): Promise<string | null> {
  return Platform.OS === 'web'
    ? globalThis.localStorage?.getItem(virtualKeyPairingUrlKey) ?? null
    : await SecureStore.getItemAsync(virtualKeyPairingUrlKey);
}

export async function storeVirtualKeyPairingUrl(virtualKeyPairingUrl: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(virtualKeyPairingUrlKey, virtualKeyPairingUrl);
    return;
  }

  await SecureStore.setItemAsync(virtualKeyPairingUrlKey, virtualKeyPairingUrl);
}

export async function removeStoredVirtualKeyPairingUrl(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(virtualKeyPairingUrlKey);
    return;
  }

  await SecureStore.deleteItemAsync(virtualKeyPairingUrlKey);
}
