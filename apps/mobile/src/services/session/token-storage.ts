import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const tokenKey = 'sentryguard.jwt';

export async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(tokenKey) ?? null;
  }

  return SecureStore.getItemAsync(tokenKey);
}

export async function storeToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(tokenKey, token);
    return;
  }

  await SecureStore.setItemAsync(tokenKey, token);
}

export async function removeStoredToken(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(tokenKey);
    return;
  }

  await SecureStore.deleteItemAsync(tokenKey);
}
