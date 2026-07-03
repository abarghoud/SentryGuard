import { uuid } from 'expo-modules-core';

import { SecureStorageRequirements } from '../storage/secure-storage';

export interface InstallationStoreRequirements {
  getInstallationId(): Promise<string>;
}

/**
 * Stable per-installation identifier used to scope device-level preferences
 * (e.g. hidden vehicles) on the server. It is minted once, survives logout and
 * push-token rotation, and is not a secret — non-cryptographic randomness is fine.
 */
export class InstallationStore implements InstallationStoreRequirements {
  private readonly installationKey = 'sentryguard.installationId';
  private cachedInstallationId: string | null = null;

  public constructor(private readonly storage: SecureStorageRequirements) {}

  public async getInstallationId(): Promise<string> {
    if (this.cachedInstallationId) {
      return this.cachedInstallationId;
    }

    const stored = await this.storage.getItem(this.installationKey);
    if (stored) {
      this.cachedInstallationId = stored;
      return stored;
    }

    const created = this.generateInstallationId();
    await this.storage.setItem(this.installationKey, created);
    this.cachedInstallationId = created;
    return created;
  }

  private generateInstallationId(): string {
    try {
      return uuid.v4();
    } catch {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const random = Math.floor(Math.random() * 16);
        const value = character === 'x' ? random : (random & 0x3) | 0x8;
        return value.toString(16);
      });
    }
  }
}
