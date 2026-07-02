import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { ThemeMode } from './theme';

const themeModeKey = 'sentryguard.themeMode';

export async function getStoredThemeMode(): Promise<ThemeMode | null> {
  const value = Platform.OS === 'web'
    ? globalThis.localStorage?.getItem(themeModeKey) ?? null
    : await SecureStore.getItemAsync(themeModeKey);

  return isThemeMode(value) ? value : null;
}

export async function storeThemeMode(mode: ThemeMode): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(themeModeKey, mode);
    return;
  }

  await SecureStore.setItemAsync(themeModeKey, mode);
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'system';
}
