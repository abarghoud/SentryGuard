import { i18n } from '../i18n';
import { ApiUrlStoreRequirements } from './api-url-store';
import { TokenStoreRequirements } from './token-store';

export interface ApiRequestOptions extends RequestInit {
  skipSessionRefresh?: boolean;
}

export interface ApiClientRequirements {
  request<T>(endpoint: string, options?: ApiRequestOptions): Promise<T>;
}

export class ApiError extends Error {
  public constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient implements ApiClientRequirements {
  private refreshSessionPromise: Promise<string | null> | null = null;

  public constructor(
    private readonly tokenStore: TokenStoreRequirements,
    private readonly apiUrlStore: ApiUrlStoreRequirements
  ) {}

  public async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const token = this.tokenStore.getToken();
    const { skipSessionRefresh, ...requestOptions } = options;
    const response = await this.fetchApi(endpoint, requestOptions, this.createHeaders(options, token));

    if (this.shouldRefreshSession(response, token, skipSessionRefresh)) {
      const retried = await this.retryAfterRefresh<T>(endpoint, options, token as string);

      if (retried.didRetry) {
        return retried.value as T;
      }
    }

    await this.assertSuccessfulResponse(response);
    return this.parseResponse<T>(response);
  }

  private async retryAfterRefresh<T>(
    endpoint: string,
    options: ApiRequestOptions,
    token: string
  ): Promise<{ didRetry: boolean; value?: T }> {
    if (this.tokenStore.getToken() !== token) {
      return { didRetry: true, value: await this.request<T>(endpoint, { ...options, skipSessionRefresh: true }) };
    }

    if (await this.refreshSessionTokenOnce(token)) {
      return { didRetry: true, value: await this.request<T>(endpoint, { ...options, skipSessionRefresh: true }) };
    }

    await this.tokenStore.clear();
    return { didRetry: false };
  }

  private shouldRefreshSession(response: Response, token: string | null, skipSessionRefresh?: boolean): boolean {
    return response.status === 401 && !!token && !skipSessionRefresh;
  }

  private createHeaders(options: ApiRequestOptions, token: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((options.headers as Record<string, string> | undefined) ?? {}),
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  private async fetchApi(endpoint: string, options: RequestInit, headers: Record<string, string>): Promise<Response> {
    return fetch(`${this.apiUrlStore.resolveUrl()}${endpoint}`, { ...options, headers }).catch((error: unknown) => {
      throw new ApiError(this.resolveNetworkErrorMessage(error));
    });
  }

  private async assertSuccessfulResponse(response: Response): Promise<void> {
    if (!response.ok) {
      throw new ApiError(await this.resolveErrorMessage(response), response.status);
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  private async refreshSessionTokenOnce(token: string): Promise<string | null> {
    this.refreshSessionPromise ??= this.refreshSessionToken(token).finally(() => {
      this.refreshSessionPromise = null;
    });

    return this.refreshSessionPromise;
  }

  private async refreshSessionToken(token: string): Promise<string | null> {
    try {
      const response = await this.fetchApi('/auth/refresh-session', { method: 'POST' }, {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      });

      return this.resolveRefreshedToken(response);
    } catch {
      return null;
    }
  }

  private async resolveRefreshedToken(response: Response): Promise<string | null> {
    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { jwt?: unknown };

    if (typeof body.jwt !== 'string') {
      return null;
    }

    await this.tokenStore.store(body.jwt);
    return body.jwt;
  }

  private resolveNetworkErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message === 'Failed to fetch') {
      return i18n.t('api.error.webCors');
    }

    return i18n.t('api.error.network');
  }

  private async resolveErrorMessage(response: Response): Promise<string> {
    const fallback = this.resolveStatusMessage(response.status);

    try {
      const body = (await response.json()) as { message?: unknown };
      return typeof body.message === 'string' ? this.resolveReadableApiMessage(body.message, fallback) : fallback;
    } catch {
      return fallback;
    }
  }

  private resolveReadableApiMessage(message: string, fallback: string): string {
    return /^Cannot [A-Z]+ \//i.test(message) ? fallback : message;
  }

  private resolveStatusMessage(status: number): string {
    if (status === 401) {
      return i18n.t('api.error.sessionExpired');
    }

    if (status === 403) {
      return i18n.t('api.error.forbidden');
    }

    if (status === 404) {
      return i18n.t('api.error.notFound');
    }

    if (status >= 500) {
      return i18n.t('api.error.unavailable');
    }

    return i18n.t('api.error.generic', { status });
  }
}
