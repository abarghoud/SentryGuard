import { getToken } from './token-manager';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(message: string, public status?: number, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ScopeError extends Error {
  constructor(public missingScopes: string[], public returnUrl?: string) {
    super('Missing required permissions');
    this.name = 'ScopeError';
  }
}

export interface ApiClientRequirements {
  request<T>(endpoint: string, options?: RequestInit): Promise<T>;
}

export class ApiClient implements ApiClientRequirements {
  private inFlightRequests = new Map<string, Promise<any>>();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 10000; // 10 seconds

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = options.method || 'GET';
    const cacheKey = `${method}:${endpoint}`;

    if (method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data as T;
      }

      const inFlight = this.inFlightRequests.get(cacheKey);
      if (inFlight) {
        return inFlight;
      }
    }

    if (method !== 'GET') {
      this.cache.clear();
    }

    const requestPromise = (async () => {
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `${API_BASE_URL}${endpoint}`;

      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (response.status === 401) {
          let errorData: any = {};
          try {
            errorData = await response.json();
          } catch (e) {
            // Ignore JSON parse errors
          }

          throw new ApiError(
            errorData?.message || 'Authentication expired. Please log in again.',
            401,
            errorData
          );
        }

        if (!response.ok) {
          let errorMessage = `API Error: ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;

            if (errorData.message?.includes('Missing required permissions')) {
              const missingScopes =
                errorData.message.match(/Missing required permissions: (.+)/)?.[1]?.split(', ') || [];
              throw new ScopeError(missingScopes);
            }

            throw new ApiError(errorMessage, response.status, errorData);
          } catch (e) {
            if (e instanceof ScopeError || e instanceof ApiError) throw e;
            throw new ApiError(errorMessage, response.status);
          }
        }

        const contentType = response.headers.get('content-type');
        let data: T;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = {} as T;
        }

        if (method === 'GET') {
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
        }

        return data;
      } catch (error) {
        if (error instanceof ApiError || error instanceof ScopeError) {
          throw error;
        }
        throw new ApiError(error instanceof Error ? error.message : 'Network error occurred');
      } finally {
        if (method === 'GET') {
          this.inFlightRequests.delete(cacheKey);
        }
      }
    })();

    if (method === 'GET') {
      this.inFlightRequests.set(cacheKey, requestPromise);
    }

    return requestPromise;
  }
}
