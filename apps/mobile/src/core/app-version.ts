import Constants from 'expo-constants';

export function readAppVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}
