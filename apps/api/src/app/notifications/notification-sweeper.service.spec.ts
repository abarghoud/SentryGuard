import { mock, MockProxy } from 'jest-mock-extended';
import { NotificationSweeperService } from './notification-sweeper.service';
import { AlertsService } from '../alerts/alerts.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { NotificationLane, NotificationQueueService } from './notification-queue.service';
import { VehicleAlertNotifierService } from '../alerts/common/vehicle-alert-notifier.service';
import { AlertEvent, AlertEventSeverity, AlertEventType, NotificationChannel } from '../../entities/alert-event.entity';

describe('The NotificationSweeperService class', () => {
  let service: NotificationSweeperService;

  let mockAlertsService: MockProxy<AlertsService>;
  let mockDistributedLockService: MockProxy<DistributedLockService>;
  let mockNotificationQueueService: MockProxy<NotificationQueueService>;
  let mockVehicleAlertNotifierService: MockProxy<VehicleAlertNotifierService>;
  let lockTask: (() => Promise<void>) | undefined;

  const buildPendingAlert = (id: string): AlertEvent => ({
    id,
    userId: `user-${id}`,
    vin: 'VIN-1',
    vehicle_display_name: 'My Tesla',
    type: AlertEventType.Sentry,
    severity: AlertEventSeverity.Warning,
    notification_status: undefined,
    notification_attempts: 0,
    notification_delivered_channels: [] as NotificationChannel[],
    created_at: new Date(),
  } as AlertEvent);

  beforeEach(() => {
    jest.clearAllMocks();

    mockAlertsService = mock<AlertsService>();
    mockDistributedLockService = mock<DistributedLockService>();
    mockNotificationQueueService = mock<NotificationQueueService>();
    mockVehicleAlertNotifierService = mock<VehicleAlertNotifierService>();
    mockVehicleAlertNotifierService.enqueueNotification.mockReturnValue(true);
    mockAlertsService.leaseNotificationForRetry.mockResolvedValue({ isLeased: true });
    mockNotificationQueueService.countRetryJobs.mockReturnValue(0);

    mockDistributedLockService.withLock.mockImplementation(async (_key: number, task: () => Promise<void>) => {
      lockTask = task;
      await task();
      return true;
    });

    service = new NotificationSweeperService(
      mockAlertsService,
      mockDistributedLockService,
      mockNotificationQueueService,
      mockVehicleAlertNotifierService
    );
  });

  describe('The sweep() method', () => {
    it('should run the sweep under a distributed lock', async () => {
      mockAlertsService.findNotificationsDueForSweep.mockResolvedValue([]);

      await service.sweep();

      expect(mockDistributedLockService.withLock).toHaveBeenCalledTimes(1);
      expect(mockDistributedLockService.withLock.mock.calls[0][0]).toBe(100003);
      expect(lockTask).toBeDefined();
    });

    it('should skip silently when the lock is not acquired', async () => {
      mockDistributedLockService.withLock.mockResolvedValue(false);

      await service.sweep();

      expect(mockAlertsService.findNotificationsDueForSweep).not.toHaveBeenCalled();
    });

    describe('When stale pending notifications exist', () => {
      beforeEach(() => {
        mockAlertsService.findNotificationsDueForSweep.mockResolvedValue([
          buildPendingAlert('alert-1'),
          buildPendingAlert('alert-2'),
        ]);
      });

      it('should query pending alerts older than the threshold', async () => {
        await service.sweep();

        expect(mockAlertsService.findNotificationsDueForSweep).toHaveBeenCalledWith(expect.any(Date), 500);
      });

      it('should re-enqueue each stale notification', async () => {
        await service.sweep();

        expect(mockVehicleAlertNotifierService.enqueueNotification).toHaveBeenCalledTimes(2);
        expect(mockVehicleAlertNotifierService.enqueueNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            alertEventId: 'alert-1',
            userId: 'user-alert-1',
            vin: 'VIN-1',
            type: AlertEventType.Sentry,
            deliveredChannels: [],
          }),
          NotificationLane.Retry
        );
      });

      it('should pass the channels that already delivered so only the failed ones are resent', async () => {
        mockAlertsService.findNotificationsDueForSweep.mockResolvedValue([
          { ...buildPendingAlert('alert-3'), notification_delivered_channels: [NotificationChannel.Expo] } as AlertEvent,
        ]);

        await service.sweep();

        expect(mockVehicleAlertNotifierService.enqueueNotification).toHaveBeenCalledWith(
          expect.objectContaining({ alertEventId: 'alert-3', deliveredChannels: [NotificationChannel.Expo] }),
          NotificationLane.Retry
        );
      });

      it('should put the retries in the retry lane so fresh alerts never wait behind them', async () => {
        await service.sweep();

        expect(mockVehicleAlertNotifierService.enqueueNotification).toHaveBeenCalledWith(expect.anything(), NotificationLane.Retry);
      });

      it('should lease each alert for five minutes before queuing it', async () => {
        await service.sweep();

        expect(mockAlertsService.leaseNotificationForRetry).toHaveBeenCalledWith('alert-1', 0, 300_000);
      });

      it('should not queue an alert that another server leased first', async () => {
        mockAlertsService.leaseNotificationForRetry.mockImplementation(async (alertEventId: string) => ({ isLeased: alertEventId !== 'alert-1' }));

        await service.sweep();

        expect(mockVehicleAlertNotifierService.enqueueNotification).not.toHaveBeenCalledWith(
          expect.objectContaining({ alertEventId: 'alert-1' }),
          expect.anything()
        );
      });

      it('should leave alerts for the next sweep once the retry lane is full', async () => {
        mockNotificationQueueService.countRetryJobs.mockReturnValue(19);

        await service.sweep();

        expect(mockVehicleAlertNotifierService.enqueueNotification).toHaveBeenCalledTimes(1);
      });

      it('should not lease the alerts it leaves for the next sweep', async () => {
        mockNotificationQueueService.countRetryJobs.mockReturnValue(20);

        await service.sweep();

        expect(mockAlertsService.leaseNotificationForRetry).not.toHaveBeenCalled();
      });

      it('should date the notification with the time the alert was recorded', async () => {
        const recordedAt = new Date('2026-11-19T21:20:00.000Z');
        mockAlertsService.findNotificationsDueForSweep.mockResolvedValue([
          { ...buildPendingAlert('alert-4'), created_at: recordedAt } as AlertEvent,
        ]);

        await service.sweep();

        expect(mockVehicleAlertNotifierService.enqueueNotification).toHaveBeenCalledWith(
          expect.objectContaining({ alertEventId: 'alert-4', detectedAt: recordedAt }),
          NotificationLane.Retry
        );
      });

      it('should skip notifications already present in the queue', async () => {
        mockNotificationQueueService.has.mockImplementation((id: string) => id === 'alert-1');

        await service.sweep();

        expect(mockVehicleAlertNotifierService.enqueueNotification).toHaveBeenCalledTimes(1);
        expect(mockVehicleAlertNotifierService.enqueueNotification).toHaveBeenCalledWith(
          expect.objectContaining({ alertEventId: 'alert-2' }),
          NotificationLane.Retry
        );
      });
    });
  });
});
