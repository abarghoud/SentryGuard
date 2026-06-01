import { SecureStorageRequirements } from '../storage/secure-storage';

type TokenListener = (token: string | null) => void;

export interface TokenStoreRequirements {
  clear(): Promise<void>;
  getToken(): string | null;
  hasToken(): boolean;
  loadFromStorage(): Promise<string | null>;
  setToken(token: string | null): void;
  store(token: string): Promise<void>;
  subscribe(listener: TokenListener): () => void;
}

export class TokenStore implements TokenStoreRequirements {
  private readonly tokenKey = 'sentryguard.jwt';
  private readonly listeners = new Set<TokenListener>();
  private accessToken: string | null = null;

  public constructor(private readonly storage: SecureStorageRequirements) {}

  public getToken(): string | null {
    return this.accessToken;
  }

  public hasToken(): boolean {
    return this.accessToken !== null;
  }

  public setToken(token: string | null): void {
    if (this.accessToken === token) {
      return;
    }

    this.accessToken = token;
    this.listeners.forEach((listener) => listener(token));
  }

  public subscribe(listener: TokenListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async loadFromStorage(): Promise<string | null> {
    const storedToken = await this.storage.getItem(this.tokenKey);
    this.setToken(storedToken);
    return storedToken;
  }

  public async store(token: string): Promise<void> {
    await this.storage.setItem(this.tokenKey, token);
    this.setToken(token);
  }

  public async clear(): Promise<void> {
    await this.storage.removeItem(this.tokenKey);
    this.setToken(null);
  }
}
