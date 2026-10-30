import { Writable } from 'stream';
import { Logger } from '@nestjs/common';
import { OciLoggingService, OciLoggingConfig } from '../services/oci-logging.service';

interface BufferedLogEntry {
  data: string;
  id: string;
  time: Date;
}

const pendingWritesMarker = Symbol('pendingWritesMarker');

interface OciTransportStreamOptions {
  ociConfig: OciLoggingConfig;
  maxBatchSize: number;
  flushIntervalMs: number;
}

export class OciTransportStream extends Writable {
  private readonly logger = new Logger(OciTransportStream.name);
  private readonly ociService: OciLoggingService;
  private readonly maxBatchSize: number;
  private readonly flushIntervalMs: number;
  private buffer: BufferedLogEntry[] = [];
  private isInitialized = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly pendingSends = new Set<Promise<void>>();

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
    if (chunk === pendingWritesMarker || !this.isInitialized) {
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

  public async flushPending(): Promise<void> {
    await this.waitForQueuedWrites();
    await this.flush();
    await Promise.all(this.pendingSends);
  }

  private waitForQueuedWrites(): Promise<void> {
    if (this.writableEnded || this.destroyed) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.write(pendingWritesMarker, () => resolve());
    });
  }

  private initialize(): void {
    this.ociService
      .onModuleInit()
      .then(() => {
        this.isInitialized = true;
        this.flushTimer = setInterval(() => {
          this.flush().catch((err) =>
            this.logger.error('[OCI_TRANSPORT_FLUSH_ERROR] Flush error:', err),
          );
        }, this.flushIntervalMs);
      })
      .catch((err) => {
        this.logger.error('[OCI_TRANSPORT_INIT_ERROR] Initialization failed:', err);
      });
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.isInitialized) return;

    const entries = [...this.buffer];
    this.buffer = [];

    await this.trackSend(this.ociService.sendLogBatch(entries));
  }

  private async trackSend(send: Promise<void>): Promise<void> {
    this.pendingSends.add(send);

    try {
      await send;
    } finally {
      this.pendingSends.delete(send);
    }
  }
}
