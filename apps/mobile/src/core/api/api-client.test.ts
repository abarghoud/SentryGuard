jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));
jest.mock('i18next', () => {
  const mockI18n = {
    use: () => mockI18n,
    init: () => mockI18n,
    t: (key: string) => key,
  };
  return {
    __esModule: true,
    default: mockI18n,
  };
});
jest.mock('react-i18next', () => ({
  initReactI18next: {},
}));

import { mock, MockProxy } from 'jest-mock-extended';

import { ApiClient, ApiError } from './api-client';
import { ApiUrlStoreRequirements } from './api-url-store';
import { TokenStoreRequirements } from './token-store';

describe('The ApiClient class', () => {
  let mockTokenStore: MockProxy<TokenStoreRequirements>;
  let mockApiUrlStore: MockProxy<ApiUrlStoreRequirements>;
  let apiClient: ApiClient;
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    mockTokenStore = mock<TokenStoreRequirements>();
    mockApiUrlStore = mock<ApiUrlStoreRequirements>();
    mockApiUrlStore.resolveUrl.mockReturnValue('https://api.test');
    apiClient = new ApiClient(mockTokenStore, mockApiUrlStore);

    fetchSpy = jest.fn();
    global.fetch = fetchSpy;
  });

  describe('The request() method', () => {
    describe('When the request is successful', () => {
      let result: unknown;

      beforeEach(async () => {
        mockTokenStore.getToken.mockReturnValue('old-token');
        fetchSpy.mockResolvedValue({
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: async () => ({ data: 'success' }),
        } as Response);

        result = await apiClient.request('/test');
      });

      it('should return the parsed response JSON', () => {
        expect(result).toStrictEqual({ data: 'success' });
      });

      it('should include the authorization header', () => {
        expect(fetchSpy).toHaveBeenCalledWith(
          'https://api.test/test',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer old-token',
            }),
          })
        );
      });
    });

    describe('When the request returns 401 and token refresh succeeds', () => {
      let result: unknown;

      beforeEach(async () => {
        mockTokenStore.getToken.mockReturnValue('old-token');
        fetchSpy
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            status: 201,
            json: async () => ({ jwt: 'new-token' }),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: {
              get: (name: string) => (name === 'content-type' ? 'application/json' : null),
            },
            json: async () => ({ data: 'retry-success' }),
          } as Response);

        result = await apiClient.request('/test');
      });

      it('should store the new token', () => {
        expect(mockTokenStore.store).toHaveBeenCalledWith('new-token');
      });

      it('should return the retried request results', () => {
        expect(result).toStrictEqual({ data: 'retry-success' });
      });
    });

    describe('When the request returns 401 and token refresh fails with 401', () => {
      let act: () => Promise<unknown>;

      beforeEach(() => {
        mockTokenStore.getToken.mockReturnValue('old-token');
        fetchSpy
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
          } as Response)
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({ message: 'Session cannot be refreshed' }),
          } as Response);

        act = () => apiClient.request('/test');
      });

      it('should clear the stored token', async () => {
        await expect(act()).rejects.toThrow(ApiError);
        expect(mockTokenStore.clear).toHaveBeenCalled();
      });
    });

    describe('When the request returns 401 and token refresh fails with a 500 server error', () => {
      let act: () => Promise<unknown>;

      beforeEach(() => {
        mockTokenStore.getToken.mockReturnValue('old-token');
        fetchSpy
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
          } as Response)
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ message: 'Internal Server Error' }),
          } as Response);

        act = () => apiClient.request('/test');
      });

      it('should propagate the error and not clear the stored token', async () => {
        await expect(act()).rejects.toThrow(ApiError);
        expect(mockTokenStore.clear).not.toHaveBeenCalled();
      });
    });

    describe('When the request returns 401 and token refresh fails with a network error', () => {
      let act: () => Promise<unknown>;

      beforeEach(() => {
        mockTokenStore.getToken.mockReturnValue('old-token');
        fetchSpy
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
          } as Response)
          .mockRejectedValueOnce(new Error('Network request failed'));

        act = () => apiClient.request('/test');
      });

      it('should propagate the error and not clear the stored token', async () => {
        await expect(act()).rejects.toThrow(ApiError);
        expect(mockTokenStore.clear).not.toHaveBeenCalled();
      });
    });
  });
});
