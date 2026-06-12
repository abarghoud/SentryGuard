import { SecureStorageRequirements } from '../storage/secure-storage';

export interface ApiUrlStoreRequirements {
  getCustomUrl(): string;
  initialize(): Promise<void>;
  reset(): Promise<void>;
  resolveUrl(): string;
  setUrl(apiUrl: string): Promise<void>;
}

export class ApiUrlStore implements ApiUrlStoreRequirements {
  private readonly apiUrlKey = 'sentryguard.apiUrl';
  private readonly defaultApiUrl = 'http://localhost:3001';
  private configuredApiUrl: string | null = null;

  public constructor(private readonly storage: SecureStorageRequirements) {}

  public resolveUrl(): string {
    return this.configuredApiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? this.defaultApiUrl;
  }

  public getCustomUrl(): string {
    return this.configuredApiUrl ?? '';
  }

  public async initialize(): Promise<void> {
    this.configuredApiUrl = await this.storage.getItem(this.apiUrlKey);
  }

  public async setUrl(apiUrl: string): Promise<void> {
    this.configuredApiUrl = this.normalize(apiUrl);
    await this.storage.setItem(this.apiUrlKey, this.configuredApiUrl);
  }

  public async reset(): Promise<void> {
    this.configuredApiUrl = null;
    await this.storage.removeItem(this.apiUrlKey);
  }

  private normalize(apiUrl: string): string {
    return apiUrl.trim().replace(/\/+$/, '');
  }
}
