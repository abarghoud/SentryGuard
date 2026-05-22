import { removeStoredToken, storeToken } from '../session/token-storage';
import { getAccessToken, setAccessToken } from './token-state';
import { getStoredApiUrl, removeStoredApiUrl, storeApiUrl } from './api-url-storage';
import { i18n } from '../../core/i18n';

const defaultApiUrl = 'http://localhost:3001';
let configuredApiUrl: string | null = null;
let refreshSessionPromise: Promise<string | null> | null = null;

interface ApiRequestOptions extends RequestInit {
  skipSessionRefresh?: boolean;
}

export class ApiError extends Error {
  public constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function requestApi<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const token = getAccessToken();
  const headers = createHeaders(options, token);
  const { skipSessionRefresh, ...requestOptions } = options;

  const response = await fetchApi(endpoint, requestOptions, headers);

  if (response.status === 401 && token && !skipSessionRefresh) {
    if (getAccessToken() !== token) {
      return requestApi<T>(endpoint, { ...options, skipSessionRefresh: true });
    }

    const refreshedToken = await refreshSessionTokenOnce(token);

    if (refreshedToken) {
      return requestApi<T>(endpoint, { ...options, skipSessionRefresh: true });
    }

    await clearExpiredSession();
  }

  await assertSuccessfulResponse(response);
  return parseResponse<T>(response);
}

function createHeaders(options: ApiRequestOptions, token: string | null): Record<string, string> {
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

async function fetchApi(endpoint: string, options: RequestInit, headers: Record<string, string>): Promise<Response> {
  return fetch(`${getApiUrl()}${endpoint}`, {
    ...options,
    headers,
  }).catch((error: unknown) => {
    throw new ApiError(resolveNetworkErrorMessage(error));
  });
}

async function assertSuccessfulResponse(response: Response): Promise<void> {
  if (!response.ok) {
    throw new ApiError(await resolveErrorMessage(response), response.status);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

async function refreshSessionTokenOnce(token: string): Promise<string | null> {
  refreshSessionPromise ??= refreshSessionToken(token).finally(() => {
    refreshSessionPromise = null;
  });

  return refreshSessionPromise;
}

async function refreshSessionToken(token: string): Promise<string | null> {
  try {
    const response = await fetchApi('/auth/refresh-session', { method: 'POST' }, {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { jwt?: unknown };

    if (typeof body.jwt !== 'string') {
      return null;
    }

    await storeToken(body.jwt);
    setAccessToken(body.jwt);

    return body.jwt;
  } catch {
    return null;
  }
}

async function clearExpiredSession(): Promise<void> {
  await removeStoredToken();
  setAccessToken(null);
}

function resolveNetworkErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'Failed to fetch') {
    return i18n.t('api.error.webCors');
  }

  return i18n.t('api.error.network');
}

function getApiUrl(): string {
  return configuredApiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl;
}

export function getCurrentApiUrl(): string {
  return getApiUrl();
}

export function getCustomApiUrl(): string {
  return configuredApiUrl ?? '';
}

export async function initializeApiUrl(): Promise<void> {
  configuredApiUrl = await getStoredApiUrl();
}

export async function setCurrentApiUrl(apiUrl: string): Promise<void> {
  configuredApiUrl = normalizeApiUrl(apiUrl);
  await storeApiUrl(configuredApiUrl);
}

export async function resetCurrentApiUrl(): Promise<void> {
  configuredApiUrl = null;
  await removeStoredApiUrl();
}

function normalizeApiUrl(apiUrl: string): string {
  return apiUrl.trim().replace(/\/+$/, '');
}

async function resolveErrorMessage(response: Response): Promise<string> {
  const fallback = resolveStatusMessage(response.status);

  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === 'string' ? resolveReadableApiMessage(body.message, fallback) : fallback;
  } catch {
    return fallback;
  }
}

function resolveReadableApiMessage(message: string, fallback: string): string {
  if (/^Cannot [A-Z]+ \//i.test(message)) {
    return fallback;
  }

  return message;
}

function resolveStatusMessage(status: number): string {
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
