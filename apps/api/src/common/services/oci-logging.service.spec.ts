import { mock } from 'jest-mock-extended';
import { OciLoggingService } from './oci-logging.service';
import * as ociLoggingIngestion from 'oci-loggingingestion';
import * as ociCommon from 'oci-common';
import * as fs from 'fs';

const mockLoggingClient = mock<ociLoggingIngestion.LoggingClient>();
const mockSimpleAuthenticationDetailsProvider =
  mock<ociCommon.SimpleAuthenticationDetailsProvider>();

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false),
}));

jest.mock('oci-loggingingestion', () => {
  const LoggingClientMock = jest
    .fn()
    .mockImplementation(() => mockLoggingClient) as unknown as jest.MockedClass<
    typeof ociLoggingIngestion.LoggingClient
  >;

  return {
    LoggingClient: LoggingClientMock,
  };
});

jest.mock('oci-common', () => {
  const actual = jest.requireActual('oci-common') as typeof import('oci-common');
  const SimpleAuthenticationDetailsProviderMock = jest
    .fn()
    .mockImplementation(() => mockSimpleAuthenticationDetailsProvider);

  return {
    ...actual,
    SimpleAuthenticationDetailsProvider: SimpleAuthenticationDetailsProviderMock,
  };
});

const mockReadFileSync = jest.mocked(fs.readFileSync);
const LoggingClientMock = jest.mocked(ociLoggingIngestion.LoggingClient);
const SimpleAuthenticationDetailsProviderMock = jest.mocked(
  ociCommon.SimpleAuthenticationDetailsProvider,
);

describe('The OciLoggingService class', () => {
  let service: OciLoggingService;
  let config: {
    enabled: boolean;
    region: string;
    logId: string;
    userOcid?: string;
    tenancyOcid?: string;
    fingerprint?: string;
    privateKey?: string;
    privateKeyPath?: string;
    privateKeyBase64?: string;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLoggingClient.putLogs.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof mockLoggingClient.putLogs>>);
    LoggingClientMock.mockImplementation(() => mockLoggingClient);

    config = {
      enabled: true,
      region: 'eu-paris-1',
      logId: 'test-log-id',
      userOcid: 'test-user-ocid',
      tenancyOcid: 'test-tenancy-ocid',
      fingerprint: 'test-fingerprint',
      privateKey: 'test-private-key',
    };

    service = new OciLoggingService(config);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('The onModuleInit() method', () => {
    describe('When enabled is false', () => {
      beforeEach(() => {
        config.enabled = false;
        service = new OciLoggingService(config);
      });

      it('should not initialize the logging client', async () => {
        await service.onModuleInit();

        expect(SimpleAuthenticationDetailsProviderMock).not.toHaveBeenCalled();
        expect(LoggingClientMock).not.toHaveBeenCalled();
        expect(service.isReady()).toBe(false);
      });
    });

    describe('When enabled is true and initialization succeeds', () => {
      beforeEach(() => {
        config.enabled = true;
        service = new OciLoggingService(config);
      });

      it('should initialize the logging client with correct parameters', async () => {
        await service.onModuleInit();

        expect(SimpleAuthenticationDetailsProviderMock).toHaveBeenCalledWith(
          'test-tenancy-ocid',
          'test-user-ocid',
          'test-fingerprint',
          'test-private-key',
          null,
          ociCommon.Region.fromRegionId('eu-paris-1'),
        );

        expect(LoggingClientMock).toHaveBeenCalledWith({
          authenticationDetailsProvider: mockSimpleAuthenticationDetailsProvider,
        });
      });

      it('should set the correct endpoint on the logging client', async () => {
        await service.onModuleInit();

        expect(mockLoggingClient.endpoint).toBe(
          'https://ingestion.logging.eu-paris-1.oci.oraclecloud.com',
        );
      });

      it('should mark the service as ready', async () => {
        await service.onModuleInit();

        expect(service.isReady()).toBe(true);
      });
    });

    describe('When enabled is true and privateKeyPath is provided', () => {
      beforeEach(() => {
        config.privateKey = undefined;
        config.privateKeyPath = '/path/to/private-key.pem';
        mockReadFileSync.mockReturnValue('file-private-key-content');
        service = new OciLoggingService(config);
      });

      it('should read the private key from file', async () => {
        await service.onModuleInit();

        expect(mockReadFileSync).toHaveBeenCalledWith(
          '/path/to/private-key.pem',
          'utf8',
        );
        expect(SimpleAuthenticationDetailsProviderMock).toHaveBeenCalledWith(
          'test-tenancy-ocid',
          'test-user-ocid',
          'test-fingerprint',
          'file-private-key-content',
          null,
          ociCommon.Region.fromRegionId('eu-paris-1'),
        );
      });
    });

    describe('When enabled is true and privateKeyBase64 is provided', () => {
      let bufferFromSpy: jest.SpyInstance;

      beforeEach(() => {
        bufferFromSpy = jest.spyOn(global.Buffer, 'from').mockReturnValue({
          toString: jest.fn().mockReturnValue('decoded-private-key'),
        } as unknown as Buffer<ArrayBuffer>);

        config = {
          enabled: true,
          region: 'eu-paris-1',
          logId: 'test-log-id',
          userOcid: 'test-user-ocid',
          tenancyOcid: 'test-tenancy-ocid',
          fingerprint: 'test-fingerprint',
          privateKeyBase64: 'encoded-private-key',
        };
        service = new OciLoggingService(config);
      });

      afterEach(() => {
        bufferFromSpy.mockRestore();
      });

      it('should decode the private key from base64', async () => {
        await service.onModuleInit();

        expect(bufferFromSpy).toHaveBeenCalledWith('encoded-private-key', 'base64');
        expect(SimpleAuthenticationDetailsProviderMock).toHaveBeenCalledWith(
          'test-tenancy-ocid',
          'test-user-ocid',
          'test-fingerprint',
          'decoded-private-key',
          null,
          ociCommon.Region.fromRegionId('eu-paris-1'),
        );
      });
    });

    describe('When enabled is true and required configuration is missing', () => {
      beforeEach(() => {
        config.userOcid = undefined;
        service = new OciLoggingService(config);
      });

      it('should not initialize and mark service as not ready', async () => {
        await service.onModuleInit();

        expect(SimpleAuthenticationDetailsProviderMock).not.toHaveBeenCalled();
        expect(LoggingClientMock).not.toHaveBeenCalled();
        expect(service.isReady()).toBe(false);
      });
    });

    describe('When enabled is true and neither privateKey nor privateKeyPath is provided', () => {
      beforeEach(() => {
        config.privateKey = undefined;
        config.privateKeyPath = undefined;
        service = new OciLoggingService(config);
      });

      it('should not initialize and mark service as not ready', async () => {
        await service.onModuleInit();

        expect(SimpleAuthenticationDetailsProviderMock).not.toHaveBeenCalled();
        expect(LoggingClientMock).not.toHaveBeenCalled();
        expect(service.isReady()).toBe(false);
      });
    });

    describe('When enabled is true and LoggingClient creation throws an error', () => {
      beforeEach(() => {
        const error = new Error('LoggingClient creation failed');
        LoggingClientMock.mockImplementation(() => {
          throw error;
        });
        service = new OciLoggingService(config);
      });

      it('should propagate the error', async () => {
        await expect(service.onModuleInit()).rejects.toThrow(
          'LoggingClient creation failed',
        );
      });

      it('should mark the service as not ready', async () => {
        await expect(service.onModuleInit()).rejects.toThrow();

        expect(service.isReady()).toBe(false);
      });
    });
  });

  describe('The sendLog() method', () => {
    describe('When service is not initialized', () => {
      it('should not send any log', async () => {
        await service.sendLog('test message');

        expect(mockLoggingClient.putLogs).not.toHaveBeenCalled();
      });
    });

    describe('When service is initialized', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        await service.onModuleInit();
        jest.clearAllMocks();
      });

      describe('When message is a string', () => {
        it('should send the log with string data', async () => {
          await service.sendLog('test log message');

          expect(mockLoggingClient.putLogs).toHaveBeenCalledWith({
            logId: 'test-log-id',
            putLogsDetails: {
              logEntryBatches: [
                {
                  entries: [
                    {
                      data: 'test log message',
                      id: expect.any(String),
                      time: expect.any(Date),
                    },
                  ],
                  source: 'tesla-guard-api',
                  type: 'STRUCTURED',
                  defaultlogentrytime: expect.any(Date),
                },
              ],
              specversion: '1.0',
            },
          });
        });
      });

      describe('When message is an object', () => {
        it('should send the log with stringified data', async () => {
          const message = { level: 'error', message: 'Something went wrong' };

          await service.sendLog(message);

          expect(mockLoggingClient.putLogs).toHaveBeenCalledWith({
            logId: 'test-log-id',
            putLogsDetails: {
              logEntryBatches: [
                {
                  entries: [
                    {
                      data: JSON.stringify(message),
                      id: expect.any(String),
                      time: expect.any(Date),
                    },
                  ],
                  source: 'tesla-guard-api',
                  type: 'STRUCTURED',
                  defaultlogentrytime: expect.any(Date),
                },
              ],
              specversion: '1.0',
            },
          });
        });
      });

      describe('When sending log fails', () => {
        beforeEach(() => {
          mockLoggingClient.putLogs.mockRejectedValue(
            new Error('Network error'),
          );
        });

        it('should handle the error silently', async () => {
          await expect(service.sendLog('test message')).resolves.not.toThrow();
        });
      });
    });
  });

  describe('The isReady() method', () => {
    describe('When service is not initialized', () => {
      it('should return false', () => {
        expect(service.isReady()).toBe(false);
      });
    });

    describe('When service is initialized', () => {
      let result: boolean;

      beforeEach(async () => {
        await service.onModuleInit();
        result = service.isReady();
      });

      it('should return true', () => {
        expect(result).toBe(true);
      });
    });
  });
});
