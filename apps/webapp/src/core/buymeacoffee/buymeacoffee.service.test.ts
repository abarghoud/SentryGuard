import { getSupportersData } from './buymeacoffee.service';

describe('The getSupportersData() function', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('When the SentryGuard backend API returns valid supporters data', () => {
    it('should return the backend supporters data', async () => {
      const mockBackendResponse = {
        subscribers: [],
        supporters: [
          {
            id: 'don-1',
            name: 'Bob',
            coffees: 3,
            isSubscriber: false,
            monthlyCoffees: undefined,
            supportDate: '2024-01-02',
            message: 'Thanks!',
          },
        ],
        totalCoffeesCount: 3,
        hasActiveSupporters: true,
      };

      global.fetch = jest.fn((url: RequestInfo | URL) => {
        const urlString = String(url);
        if (urlString.includes('/supporters')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBackendResponse),
          } as Response);
        }
        return Promise.reject(new Error('Unknown url'));
      });

      const result = await getSupportersData();

      expect(result).toStrictEqual(mockBackendResponse);
    });
  });

  describe('When backend is offline or returns error', () => {
    it('should return empty supporters data without throwing errors', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Backend offline')));

      const result = await getSupportersData();

      expect(result).toStrictEqual({
        subscribers: [],
        supporters: [],
        totalCoffeesCount: 0,
        hasActiveSupporters: false,
      });
    });

    it('should return empty supporters data when response is not ok', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        } as Response)
      );

      const result = await getSupportersData();

      expect(result).toStrictEqual({
        subscribers: [],
        supporters: [],
        totalCoffeesCount: 0,
        hasActiveSupporters: false,
      });
    });
  });
});
