import { mock } from 'jest-mock-extended';
import { Logger } from '@nestjs/common';
import { OciTransportStream } from './oci-transport-stream';
import { OciLoggingConfig, OciLoggingService } from '../services/oci-logging.service';

const mockOciLoggingService = mock<OciLoggingService>();

jest.mock('../services/oci-logging.service', () => ({
  OciLoggingService: jest.fn().mockImplementation(() => mockOciLoggingService),
}));

const ociConfig: OciLoggingConfig = {
  enabled: true,
  logId: 'ocid1.log.oc1..test',
  region: 'eu-paris-1',
};

const flushIntervalMs = 5000;

const createStream = (maxBatchSize = 50): OciTransportStream =>
  new OciTransportStream({ flushIntervalMs, maxBatchSize, ociConfig });

const settle = (): Promise<void> => jest.advanceTimersByTimeAsync(0);

const sentData = (callIndex: number): string[] =>
  mockOciLoggingService.sendLogBatch.mock.calls[callIndex][0].map((entry: { data: string }) => entry.data);

const createPendingSend = (): { onSent: () => void; send: Promise<void> } => {
  let onSent: () => void = () => undefined;
  const send = new Promise<void>((resolve) => {
    onSent = resolve;
  });
  return { onSent, send };
};

describe('The OciTransportStream class', () => {
  let stream: OciTransportStream;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    mockOciLoggingService.onModuleInit.mockResolvedValue(undefined);
    mockOciLoggingService.sendLogBatch.mockResolvedValue(undefined);
    stream = createStream();
    await settle();
  });

  afterEach(() => {
    stream.destroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('The flushPending() method', () => {
    it('should send the buffered entries without waiting for the flush interval', async () => {
      stream.write('first line');
      stream.write('second line');

      await stream.flushPending();

      expect(sentData(0)).toStrictEqual(['first line', 'second line']);
    });

    it('should not send anything when no entry is buffered', async () => {
      await stream.flushPending();

      expect(mockOciLoggingService.sendLogBatch).not.toHaveBeenCalled();
    });

    it('should wait for a send already started by the flush interval', async () => {
      const pendingSend = createPendingSend();
      mockOciLoggingService.sendLogBatch.mockReturnValueOnce(pendingSend.send);
      stream.write('interval line');
      await jest.advanceTimersByTimeAsync(flushIntervalMs);
      let isFlushed = false;

      const flush = stream.flushPending().then(() => {
        isFlushed = true;
      });
      await settle();
      const isFlushedBeforeSend = isFlushed;
      pendingSend.onSent();
      await flush;

      expect([isFlushedBeforeSend, isFlushed]).toStrictEqual([false, true]);
    });

    it('should send the entries written while a full batch was being sent', async () => {
      stream.destroy();
      stream = createStream(2);
      await settle();
      const pendingSend = createPendingSend();
      mockOciLoggingService.sendLogBatch.mockReturnValueOnce(pendingSend.send);
      stream.write('first line');
      stream.write('second line');
      stream.write('fatal line');

      const flush = stream.flushPending();
      pendingSend.onSent();
      await flush;

      expect(sentData(1)).toStrictEqual(['fatal line']);
    });

    it('should resolve once the stream has ended', async () => {
      stream.end();

      await expect(stream.flushPending()).resolves.toBeUndefined();
    });
  });
});
