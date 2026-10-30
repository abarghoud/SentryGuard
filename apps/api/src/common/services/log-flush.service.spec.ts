import { mock } from 'jest-mock-extended';
import { LogFlushService } from './log-flush.service';
import { OciTransportStream } from '../transports/oci-transport-stream';

describe('The LogFlushService class', () => {
  describe('The flush() method', () => {
    it('should flush the pending logs of the OCI transport', async () => {
      const ociTransportStream = mock<OciTransportStream>();
      ociTransportStream.flushPending.mockResolvedValue(undefined);
      const logFlushService = new LogFlushService(ociTransportStream);

      await logFlushService.flush();

      expect(ociTransportStream.flushPending).toHaveBeenCalledTimes(1);
    });

    it('should resolve without doing anything when OCI logging is disabled', async () => {
      const logFlushService = new LogFlushService(null);

      await expect(logFlushService.flush()).resolves.toBeUndefined();
    });
  });
});
