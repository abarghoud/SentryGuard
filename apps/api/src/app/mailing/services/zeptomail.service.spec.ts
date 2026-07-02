import { ZeptomailService } from './zeptomail.service';

describe('The ZeptomailService class', () => {
  const originalEnv = process.env;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env = {
      ...originalEnv,
      ZEPTOMAIL_API_KEY: 'test-api-key',
      ZEPTOMAIL_FROM_EMAIL: 'test@sentryguard.org',
      ZEPTOMAIL_FROM_NAME: 'TestSentryGuard',
    };

    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('When constructing the service', () => {
    describe('When required environment variables are missing', () => {
      it('should throw error when ZEPTOMAIL_API_KEY is missing', () => {
        delete process.env.ZEPTOMAIL_API_KEY;

        expect(() => new ZeptomailService()).toThrow(
          'ZEPTOMAIL_API_KEY environment variable is required'
        );
      });

      it('should throw error when ZEPTOMAIL_FROM_EMAIL is missing', () => {
        delete process.env.ZEPTOMAIL_FROM_EMAIL;

        expect(() => new ZeptomailService()).toThrow(
          'ZEPTOMAIL_FROM_EMAIL environment variable is required'
        );
      });
    });

    describe('When all required environment variables are present', () => {
      it('should create service instance', () => {
        const service = new ZeptomailService();

        expect(service).toBeInstanceOf(ZeptomailService);
      });
    });
  });

  describe('The sendTemplateEmail() method', () => {
    let service: ZeptomailService;
    const to = 'recipient@example.com';
    const templateKey = 'test-template-key';
    const mergeInfo = { name: 'John Doe' };

    beforeEach(() => {
      service = new ZeptomailService();
    });

    describe('When sending template email successfully', () => {
      beforeEach(async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          text: async () => 'OK',
        } as Response);

        await service.sendTemplateEmail(to, templateKey, mergeInfo);
      });

      it('should call fetch once', () => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should call fetch with correct URL and method', () => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.zeptomail.com/v1.1/email/template',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      it('should include correct headers', () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: {
              'Authorization': 'Zoho-enczapikey test-api-key',
              'Content-Type': 'application/json',
            },
          })
        );
      });

      it('should include correct body content', () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({
              from: {
                address: 'test@sentryguard.org',
                name: 'TestSentryGuard',
              },
              to: [
                {
                  email_address: {
                    address: to,
                  },
                },
              ],
              template_key: templateKey,
              merge_info: mergeInfo,
            }),
          })
        );
      });
    });

    describe('When Zeptomail API returns an error status', () => {
      let act: () => Promise<void>;

      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          text: async () => 'Invalid key',
        } as Response);

        act = () => service.sendTemplateEmail(to, templateKey, mergeInfo);
      });

      it('should throw an error with details', async () => {
        await expect(act()).rejects.toThrow(
          'Zeptomail API returned status 400: Invalid key'
        );
      });
    });

    describe('When fetch network call fails', () => {
      const expectedError = new Error('Network Error');
      let act: () => Promise<void>;

      beforeEach(() => {
        mockFetch.mockRejectedValue(expectedError);
        act = () => service.sendTemplateEmail(to, templateKey, mergeInfo);
      });

      it('should throw the network error', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });
  });
});
