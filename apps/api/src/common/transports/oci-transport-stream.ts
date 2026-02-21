import { Writable } from 'stream';
import { OciLoggingService, OciLoggingConfig } from '../services/oci-logging.service';

interface BufferedLogEntry {
  data: string;
  id: string;
  time: Date;
}

interface OciTransportStreamOptions {
  ociConfig: OciLoggingConfig;
  maxBatchSize: number;
  flushIntervalMs: number;
}

export class OciTransportStream extends Writable {
  private readonly ociService: OciLoggingService;
  private readonly maxBatchSize: number;
  private readonly flushIntervalMs: number;
  private buffer: BufferedLogEntry[] = [];
  private isInitialized = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  public constructor(options: OciTransportStreamOptions) {
    super({ objectMode: true });

    this.ociService = new OciLoggingService(options.ociConfig);
    this.maxBatchSize = options.maxBatchSize;
    this.flushIntervalMs = options.flushIntervalMs;

    this.initialize();
  }

  public override _write(
    chunk: unknown,
    _encoding: string,
    callback: (error?: Error | null) => void,
  ): void {
    if (!this.isInitialized) {
      callback();
      return;
    }

    try {
      const data = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);

      this.buffer.push({
        data,
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        time: new Date(),
      });

      if (this.buffer.length >= this.maxBatchSize) {
        this.flush()
          .then(() => callback())
          .catch((error: unknown) =>
            callback(error instanceof Error ? error : new Error(String(error))),
          );
        return;
      }

      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  public override _final(callback: (error?: Error | null) => void): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flush()
      .then(() => callback())
      .catch((error: unknown) =>
        callback(error instanceof Error ? error : new Error(String(error))),
      );
  }

  private initialize(): void {
    this.ociService
      .onModuleInit()
      .then(() => {
        this.isInitialized = true;
        this.flushTimer = setInterval(() => {
          this.flush().catch((err) =>
            console.error('[OCI Transport] Flush error:', err),
          );
        }, this.flushIntervalMs);
      })
      .catch((err) => {
        console.error('[OCI Transport] Initialization failed:', err);
      });
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.isInitialized) return;

    const entries = [...this.buffer];
    this.buffer = [];

    await this.ociService.sendLogBatch(entries);
  }
}
