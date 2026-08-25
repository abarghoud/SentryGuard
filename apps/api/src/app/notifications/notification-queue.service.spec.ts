import { mock, MockProxy } from 'jest-mock-extended';
import { NotificationQueueService } from './notification-queue.service';
import { TokenBucketRateLimiterService } from '../../common/services/token-bucket-rate-limiter.service';

describe('The NotificationQueueService class', () => {
  let mockRateLimiter: MockProxy<TokenBucketRateLimiterService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimiter = mock<TokenBucketRateLimiterService>();
    mockRateLimiter.acquire.mockResolvedValue(undefined);
  });

  describe('The enqueue() method', () => {
    it('should execute the enqueued task', async () => {
      const service = new NotificationQueueService(mockRateLimiter, 100, 2);
      const task = jest.fn().mockResolvedValue(undefined);

      service.enqueue(task, { label: 'TEST:user-1', vin: 'VIN-1', correlationId: 'corr-1' });

      await service.drain(1000);

      expect(task).toHaveBeenCalledTimes(1);
      expect(mockRateLimiter.acquire).toHaveBeenCalledTimes(1);
    });

    it('should acquire a rate limiter token before executing each task', async () => {
      const service = new NotificationQueueService(mockRateLimiter, 100, 2);
      const firstTask = jest.fn().mockResolvedValue(undefined);
      const secondTask = jest.fn().mockResolvedValue(undefined);

      service.enqueue(firstTask, { label: 'A', vin: 'VIN-1' });
      service.enqueue(secondTask, { label: 'B', vin: 'VIN-2' });

      await service.drain(1000);

      expect(mockRateLimiter.acquire).toHaveBeenCalledTimes(2);
    });

    it('should keep processing remaining tasks when a task fails', async () => {
      const service = new NotificationQueueService(mockRateLimiter, 100, 2);
      const failingTask = jest.fn().mockRejectedValue(new Error('Network Error'));
      const healthyTask = jest.fn().mockResolvedValue(undefined);

      service.enqueue(failingTask, { label: 'FAILING', vin: 'VIN-1' });
      service.enqueue(healthyTask, { label: 'HEALTHY', vin: 'VIN-2' });

      await service.drain(1000);

      expect(failingTask).toHaveBeenCalledTimes(1);
      expect(healthyTask).toHaveBeenCalledTimes(1);
    });

    it('should drop new tasks when the queue is full', async () => {
      const service = new NotificationQueueService(mockRateLimiter, 1, 1);
      const blockingTask = jest.fn().mockReturnValue(new Promise<void>(() => undefined));
      const droppedTask = jest.fn().mockResolvedValue(undefined);

      service.enqueue(blockingTask, { label: 'BLOCKING', vin: 'VIN-1' });
      service.enqueue(droppedTask, { label: 'DROPPED', vin: 'VIN-2' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(droppedTask).not.toHaveBeenCalled();
      expect(blockingTask).toHaveBeenCalledTimes(1);
    });

    it('should drop new tasks once drain has started', async () => {
      const service = new NotificationQueueService(mockRateLimiter, 100, 1);
      const droppedTask = jest.fn().mockResolvedValue(undefined);

      await service.drain(10);
      service.enqueue(droppedTask, { label: 'DROPPED', vin: 'VIN-1' });

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(droppedTask).not.toHaveBeenCalled();
    });
  });

  describe('The has() method', () => {
    it('should return false for an unknown alert event id', () => {
      const service = new NotificationQueueService(mockRateLimiter, 100, 2);

      expect(service.has('unknown-id')).toBe(false);
    });

    it('should return true while a job carrying the alert event id is queued or running', async () => {
      const service = new NotificationQueueService(mockRateLimiter, 100, 1);
      const slowTask = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      service.enqueue(slowTask, { label: 'SLOW', vin: 'VIN-1', alertEventId: 'alert-1' });

      expect(service.has('alert-1')).toBe(true);

      await service.drain(1000);

      expect(service.has('alert-1')).toBe(false);
    });

    it('should keep tracking an id referenced by multiple queued jobs', async () => {
      const service = new NotificationQueueService(mockRateLimiter, 100, 1);
      const task = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      service.enqueue(task, { label: 'A', vin: 'VIN-1', alertEventId: 'alert-1' });
      service.enqueue(task, { label: 'B', vin: 'VIN-1', alertEventId: 'alert-1' });

      await service.drain(1000);

      expect(service.has('alert-1')).toBe(false);
      expect(task).toHaveBeenCalledTimes(2);
    });
  });

  describe('The drain() method', () => {
    it('should resolve when all tasks have completed', async () => {
      const service = new NotificationQueueService(mockRateLimiter, 100, 2);
      const slowTask = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      service.enqueue(slowTask, { label: 'SLOW', vin: 'VIN-1' });

      await service.drain(5000);

      expect(slowTask).toHaveBeenCalledTimes(1);
    });

    it('should return after the timeout when tasks are still running', async () => {
      const service = new NotificationQueueService(mockRateLimiter, 100, 1);
      const blockingTask = jest.fn().mockReturnValue(new Promise<void>(() => undefined));

      service.enqueue(blockingTask, { label: 'BLOCKING', vin: 'VIN-1' });

      const start = Date.now();
      await service.drain(100);

      expect(Date.now() - start).toBeLessThan(2000);
    });
  });
});
