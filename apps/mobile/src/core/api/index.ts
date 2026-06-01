import { VirtualKeyStore } from '../config/virtual-key-store';
import { SecureStorage } from '../storage/secure-storage';
import { ApiClient } from './api-client';
import { ApiUrlStore } from './api-url-store';
import { TokenStore } from './token-store';

export const secureStorage = new SecureStorage();
export const tokenStore = new TokenStore(secureStorage);
export const apiUrlStore = new ApiUrlStore(secureStorage);
export const virtualKeyStore = new VirtualKeyStore(secureStorage);
export const apiClient = new ApiClient(tokenStore, apiUrlStore);

export async function initializeRuntimeConfig(): Promise<void> {
  await Promise.all([apiUrlStore.initialize(), virtualKeyStore.initialize()]);
}

export * from './api-client';
export * from './token-store';
export * from './api-url-store';
