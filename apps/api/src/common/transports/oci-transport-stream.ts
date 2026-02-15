import { Writable } from 'stream';
import { OciLoggingService, OciLoggingConfig } from '../services/oci-logging.service';

interface BufferedLogEntry {
  data: string;
  id: string;
  time: Date;
}

interface TransportOptions {
  ociConfig: OciLoggingConfig;
  maxBatchSize: number;
  flushIntervalMs: number;
}

export function createOciTransportStream(options: TransportOptions): Writable {
  const ociService = new OciLoggingService(options.ociConfig);

  let buffer: BufferedLogEntry[] = [];
  let isInitialized = false;
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  const flush = async () => {
    if (buffer.length === 0 || !isInitialized) return;

    const entries = [...buffer];
    buffer = [];

    await ociService.sendLogBatch(entries);
  };

  const stream = new Writable({
    objectMode: true,
    async write(chunk: unknown, _encoding: string, callback: (error?: Error | null) => void) {
      if (!isInitialized) {
        callback();
        return;
      }

      try {
        const data = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);

        buffer.push({
          data,
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          time: new Date(),
        });

        if (buffer.length >= options.maxBatchSize) {
          await flush();
        }

        callback();
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async final(callback: (error?: Error | null) => void) {
      if (flushTimer) {
        clearInterval(flushTimer);
      }

      try {
        await flush();
        callback();
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    }
  });

  ociService.onModuleInit()
    .then(() => {
      isInitialized = true;
      flushTimer = setInterval(() => {
        flush().catch(err => console.error('[OCI Transport] Flush error:', err));
      }, options.flushIntervalMs);
    })
    .catch(err => {
      console.error('[OCI Transport] Initialization failed:', err);
    });

  return stream;
}