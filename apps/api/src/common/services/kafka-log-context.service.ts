import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { storage, Store } from 'nestjs-pino/storage';

interface KafkaLogContext {
  vin: string;
  correlationId: string;
}

@Injectable()
export class KafkaLogContextService {
  constructor(private readonly pinoLogger: PinoLogger) {}

  public async runWithContext<T>(
    context: KafkaLogContext,
    callback: () => Promise<T>
  ): Promise<T> {
    const childLogger = PinoLogger.root.child({
      vin: context.vin,
      correlationId: context.correlationId,
    });

    return storage.run(new Store(childLogger), callback);
  }

  public assignUserId(userId: string): void {
    this.pinoLogger.assign({ userId });
  }
}
