import { VirtualKeyStore } from '../config/virtual-key-store';
import { appLogger } from '../logging';
import { SecureStorage } from '../storage/secure-storage';
import { ApiClient } from './api-client';
import { ApiUrlStore } from './api-url-store';
import { TokenStore } from './token-store';
import { SessionValidator } from '../session/session-validator';

export const secureStorage = new SecureStorage();
export const tokenStore = new TokenStore(secureStorage);
export const apiUrlStore = new ApiUrlStore(secureStorage);
export const virtualKeyStore = new VirtualKeyStore(secureStorage);
export const apiClient = new ApiClient(tokenStore, apiUrlStore, appLogger);
export const sessionValidator = new SessionValidator(apiClient, tokenStore);

export async function initializeRuntimeConfig(): Promise<void> {
  await Promise.all([
    apiUrlStore.initialize(),
    virtualKeyStore.initialize(),
    tokenStore.loadFromStorage(),
  ]);
}

export * from './api-client';
export * from './token-store';
export * from './api-url-store';
export * from '../session/session-validator';
