import { Injectable, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { KafkaService } from '../messaging/kafka/kafka.service';
import { BreakInAlertHandlerService } from '../alerts/break-in/break-in-alert-handler.service';

@Injectable()
export class GracefulShutdownService {
  private readonly logger = new Logger(GracefulShutdownService.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly kafkaService: KafkaService,
    private readonly breakInAlertHandler: BreakInAlertHandlerService,
  ) {}

  public async initiateShutdown(): Promise<void> {
    this.logger.log('🛑 Graceful shutdown initiated');

    this.stopAcceptingHttpRequests();

    await this.kafkaService.pauseConsumer();
    await this.kafkaService.drainInFlight(this.getKafkaDrainTimeoutMs());

    await this.breakInAlertHandler.flushPendingVerifications(this.getAlertFlushTimeoutMs());

    this.logger.log('✅ Graceful shutdown drain complete');
  }

  private stopAcceptingHttpRequests(): void {
    const httpServer = this.httpAdapterHost.httpAdapter?.getHttpServer();

    if (!httpServer || typeof httpServer.close !== 'function') {
      this.logger.warn('HTTP server not available, skipping HTTP drain');
      return;
    }

    httpServer.close();
    if (typeof httpServer.closeIdleConnections === 'function') {
      httpServer.closeIdleConnections();
    }
    this.logger.log('HTTP server no longer accepting new requests');
  }

  private getKafkaDrainTimeoutMs(): number {
    return parseInt(process.env.GRACEFUL_SHUTDOWN_KAFKA_DRAIN_TIMEOUT_MS || '15000', 10);
  }

  private getAlertFlushTimeoutMs(): number {
    return parseInt(process.env.GRACEFUL_SHUTDOWN_ALERT_FLUSH_TIMEOUT_MS || '30000', 10);
  }
}
