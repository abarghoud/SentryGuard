import { mock, MockProxy } from 'jest-mock-extended';
import { NotificationSweeperService } from './notification-sweeper.service';
import { AlertsService } from '../alerts/alerts.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { NotificationQueueService } from './notification-queue.service';
import { VehicleAlertNotifierService } from '../alerts/common/vehicle-alert-notifier.service';
import { AlertEvent, AlertEventSeverity, AlertEventType } from '../../entities/alert-event.entity';

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
    created_at: new Date(),
  } as AlertEvent);

  beforeEach(() => {
    jest.clearAllMocks();

    mockAlertsService = mock<AlertsService>();
    mockDistributedLockService = mock<DistributedLockService>();
    mockNotificationQueueService = mock<NotificationQueueService>();
    mockVehicleAlertNotifierService = mock<VehicleAlertNotifierService>();

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
      mockAlertsService.findPendingNotificationsBefore.mockResolvedValue([]);

      await service.sweep();

      expect(mockDistributedLockService.withLock).toHaveBeenCalledTimes(1);
      expect(mockDistributedLockService.withLock.mock.calls[0][0]).toBe(100003);
      expect(lockTask).toBeDefined();
    });

    it('should skip silently when the lock is not acquired', async () => {
      mockDistributedLockService.withLock.mockResolvedValue(false);

      await service.sweep();

      expect(mockAlertsService.findPendingNotificationsBefore).not.toHaveBeenCalled();
    });

    describe('When stale pending notifications exist', () => {
      beforeEach(() => {
        mockAlertsService.findPendingNotificationsBefore.mockResolvedValue([
          buildPendingAlert('alert-1'),
          buildPendingAlert('alert-2'),
        ]);
      });

      it('should query pending alerts older than the threshold', async () => {
        await service.sweep();

        expect(mockAlertsService.findPendingNotificationsBefore).toHaveBeenCalledWith(expect.any(Date));
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
          })
        );
      });

      it('should skip notifications already present in the queue', async () => {
        mockNotificationQueueService.has.mockImplementation((id: string) => id === 'alert-1');

        await service.sweep();

        expect(mockVehicleAlertNotifierService.enqueueNotification).toHaveBeenCalledTimes(1);
        expect(mockVehicleAlertNotifierService.enqueueNotification).toHaveBeenCalledWith(
          expect.objectContaining({ alertEventId: 'alert-2' })
        );
      });
    });
  });
});
