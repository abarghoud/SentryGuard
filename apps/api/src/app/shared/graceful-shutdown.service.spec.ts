import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';

import { HttpAdapterHost } from '@nestjs/core';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { KafkaService } from '../messaging/kafka/kafka.service';
import { BreakInAlertHandlerService } from '../alerts/break-in/break-in-alert-handler.service';
import { NotificationQueueService } from '../notifications/notification-queue.service';

describe('The GracefulShutdownService class', () => {
  let service: GracefulShutdownService;

  let mockKafkaService: MockProxy<KafkaService>;
  let mockBreakInAlertHandler: MockProxy<BreakInAlertHandlerService>;
  let mockNotificationQueueService: MockProxy<NotificationQueueService>;
  let httpServer: { close: jest.Mock; closeIdleConnections: jest.Mock };

  beforeEach(async () => {
    httpServer = {
      close: jest.fn(),
      closeIdleConnections: jest.fn(),
    };

    const httpAdapterHost = {
      httpAdapter: {
        getHttpServer: () => httpServer,
      },
    } as unknown as HttpAdapterHost;

    mockKafkaService = mock<KafkaService>();
    mockKafkaService.pauseConsumer.mockResolvedValue(undefined);
    mockKafkaService.drainInFlight.mockResolvedValue(undefined);

    mockBreakInAlertHandler = mock<BreakInAlertHandlerService>();
    mockBreakInAlertHandler.flushPendingVerifications.mockResolvedValue(undefined);

    mockNotificationQueueService = mock<NotificationQueueService>();
    mockNotificationQueueService.drain.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GracefulShutdownService,
        { provide: HttpAdapterHost, useValue: httpAdapterHost },
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: BreakInAlertHandlerService, useValue: mockBreakInAlertHandler },
        { provide: NotificationQueueService, useValue: mockNotificationQueueService },
      ],
    }).compile();

    service = module.get<GracefulShutdownService>(GracefulShutdownService);
  });

  afterEach(() => {
    delete process.env.GRACEFUL_SHUTDOWN_KAFKA_DRAIN_TIMEOUT_MS;
    delete process.env.GRACEFUL_SHUTDOWN_ALERT_FLUSH_TIMEOUT_MS;
    delete process.env.GRACEFUL_SHUTDOWN_NOTIFICATION_DRAIN_TIMEOUT_MS;
  });

  describe('The initiateShutdown() method', () => {
    it('should stop the HTTP server from accepting new requests', async () => {
      await service.initiateShutdown();
      expect(httpServer.close).toHaveBeenCalled();
    });

    it('should close idle HTTP connections', async () => {
      await service.initiateShutdown();
      expect(httpServer.closeIdleConnections).toHaveBeenCalled();
    });

    it('should pause the Kafka consumer', async () => {
      await service.initiateShutdown();
      expect(mockKafkaService.pauseConsumer).toHaveBeenCalledTimes(1);
    });

    it('should drain in-flight Kafka messages with the default timeout', async () => {
      await service.initiateShutdown();
      expect(mockKafkaService.drainInFlight).toHaveBeenCalledWith(15000);
    });

    it('should flush pending display-lock alert verifications with the default timeout', async () => {
      await service.initiateShutdown();
      expect(mockBreakInAlertHandler.flushPendingVerifications).toHaveBeenCalledWith(30000);
    });

    it('should drain the notification queue with the default timeout', async () => {
      await service.initiateShutdown();
      expect(mockNotificationQueueService.drain).toHaveBeenCalledWith(30000);
    });

    it('should drain the notification queue after flushing alert verifications', async () => {
      const callOrder: string[] = [];

      mockBreakInAlertHandler.flushPendingVerifications.mockImplementation(async () => {
        callOrder.push('alerts');
      });
      mockNotificationQueueService.drain.mockImplementation(async () => {
        callOrder.push('queue');
      });

      await service.initiateShutdown();

      expect(callOrder).toStrictEqual(['alerts', 'queue']);
    });

    it('should use the configured timeouts from environment variables', async () => {
      process.env.GRACEFUL_SHUTDOWN_KAFKA_DRAIN_TIMEOUT_MS = '5000';
      process.env.GRACEFUL_SHUTDOWN_ALERT_FLUSH_TIMEOUT_MS = '7000';
      process.env.GRACEFUL_SHUTDOWN_NOTIFICATION_DRAIN_TIMEOUT_MS = '8000';

      await service.initiateShutdown();

      expect(mockKafkaService.drainInFlight).toHaveBeenCalledWith(5000);
      expect(mockBreakInAlertHandler.flushPendingVerifications).toHaveBeenCalledWith(7000);
      expect(mockNotificationQueueService.drain).toHaveBeenCalledWith(8000);
    });

    it('should still drain Kafka and alerts when no HTTP server is available', async () => {
      const httpAdapterHostWithoutServer = {
        httpAdapter: {
          getHttpServer: () => undefined,
        },
      } as unknown as HttpAdapterHost;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GracefulShutdownService,
          { provide: HttpAdapterHost, useValue: httpAdapterHostWithoutServer },
          { provide: KafkaService, useValue: mockKafkaService },
          { provide: BreakInAlertHandlerService, useValue: mockBreakInAlertHandler },
          { provide: NotificationQueueService, useValue: mockNotificationQueueService },
        ],
      }).compile();

      const serviceWithoutServer = module.get<GracefulShutdownService>(GracefulShutdownService);

      await expect(serviceWithoutServer.initiateShutdown()).resolves.toBeUndefined();
      expect(mockKafkaService.pauseConsumer).toHaveBeenCalledTimes(1);
    });
  });
});
