import { SecureStorageRequirements } from '../storage/secure-storage';
import { buildTeslaPairingUrl, normalizeDomain } from './app-domain';

export interface VirtualKeyStoreRequirements {
  getCustomUrl(): string;
  initialize(): Promise<void>;
  reset(): Promise<void>;
  resolveDomain(): string;
  resolveUrl(): string;
  setUrl(virtualKeyPairingUrl: string): Promise<void>;
}

export class VirtualKeyStore implements VirtualKeyStoreRequirements {
  private readonly virtualKeyPairingUrlKey = 'sentryguard.virtualKeyPairingUrl';
  private configuredVirtualKeyPairingUrl: string | null = null;

  public constructor(private readonly storage: SecureStorageRequirements) {}

  public resolveDomain(): string {
    return normalizeDomain(this.configuredVirtualKeyPairingUrl ?? process.env.EXPO_PUBLIC_VIRTUAL_KEY_PAIRING_URL ?? '');
  }

  public resolveUrl(): string {
    return buildTeslaPairingUrl(this.resolveDomain());
  }

  public getCustomUrl(): string {
    return this.configuredVirtualKeyPairingUrl ?? '';
  }

  public async initialize(): Promise<void> {
    this.configuredVirtualKeyPairingUrl = await this.storage.getItem(this.virtualKeyPairingUrlKey);
  }

  public async setUrl(virtualKeyPairingUrl: string): Promise<void> {
    this.configuredVirtualKeyPairingUrl = virtualKeyPairingUrl.trim();
    await this.storage.setItem(this.virtualKeyPairingUrlKey, this.configuredVirtualKeyPairingUrl);
  }

  public async reset(): Promise<void> {
    this.configuredVirtualKeyPairingUrl = null;
    await this.storage.removeItem(this.virtualKeyPairingUrlKey);
  }
}
