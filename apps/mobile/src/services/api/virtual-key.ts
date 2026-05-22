import { getStoredVirtualKeyPairingUrl, removeStoredVirtualKeyPairingUrl, storeVirtualKeyPairingUrl } from './api-url-storage';

let configuredVirtualKeyPairingUrl: string | null = null;

export function resolveVirtualKeyUrl(): string {
  return configuredVirtualKeyPairingUrl ?? process.env.EXPO_PUBLIC_VIRTUAL_KEY_PAIRING_URL ?? '';
}

export function getCustomVirtualKeyPairingUrl(): string {
  return configuredVirtualKeyPairingUrl ?? '';
}

export async function initializeVirtualKeyPairingUrl(): Promise<void> {
  configuredVirtualKeyPairingUrl = await getStoredVirtualKeyPairingUrl();
}

export async function setCurrentVirtualKeyPairingUrl(virtualKeyPairingUrl: string): Promise<void> {
  configuredVirtualKeyPairingUrl = normalizeVirtualKeyPairingUrl(virtualKeyPairingUrl);
  await storeVirtualKeyPairingUrl(configuredVirtualKeyPairingUrl);
}

export async function resetCurrentVirtualKeyPairingUrl(): Promise<void> {
  configuredVirtualKeyPairingUrl = null;
  await removeStoredVirtualKeyPairingUrl();
}

function normalizeVirtualKeyPairingUrl(virtualKeyPairingUrl: string): string {
  return virtualKeyPairingUrl.trim();
}
