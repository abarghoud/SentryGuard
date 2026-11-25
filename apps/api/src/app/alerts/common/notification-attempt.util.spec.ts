import { AlertEventNotificationStatus, NotificationChannel } from '../../../entities/alert-event.entity';
import { AlertNotificationState } from '../interfaces/alert-notification-repository.requirements';
import {
  computeRetryDelayMs,
  mergeDeliveredChannels,
  toFailedAttemptState,
  toSentState,
  toUndeliverableState,
} from './notification-attempt.util';
import {
  NOTIFICATION_RETRY_BASE_DELAY_MS,
  NOTIFICATION_RETRY_MAX_DELAY_MS,
  NOTIFICATION_SWEEP_MAX_ATTEMPTS,
} from '../../../config/notification-sweep-cron.config';

const policy = { baseDelayMs: 60_000, maxAttempts: 6, maxDelayMs: 900_000 };
const now = new Date('2026-11-18T22:10:00Z');
const pendingState = (overrides: Partial<AlertNotificationState> = {}): AlertNotificationState => ({
  attempts: 0,
  deliveredChannels: [],
  nextAttemptAt: null,
  status: AlertEventNotificationStatus.Pending,
  ...overrides,
});

describe('The computeRetryDelayMs() function', () => {
  describe('When computing the delay after each failed attempt', () => {
    it('should double from the base delay and cap at the maximum delay', () => {
      expect([1, 2, 3, 4, 5].map((failedAttempts) => computeRetryDelayMs(failedAttempts, policy))).toStrictEqual([
        60_000, 120_000, 240_000, 480_000, 900_000,
      ]);
    });
  });

  describe('When the attempt count is huge', () => {
    it('should still return the maximum delay', () => {
      expect(computeRetryDelayMs(10_000, policy)).toBe(900_000);
    });
  });

  describe('When using the default retry configuration', () => {
    it('should keep retrying through at least three hours of outage', () => {
      const defaultPolicy = {
        baseDelayMs: NOTIFICATION_RETRY_BASE_DELAY_MS,
        maxAttempts: NOTIFICATION_SWEEP_MAX_ATTEMPTS,
        maxDelayMs: NOTIFICATION_RETRY_MAX_DELAY_MS,
      };
      const failedAttempts = Array.from({ length: defaultPolicy.maxAttempts - 1 }, (_, index) => index + 1);

      const retryWindowMs = failedAttempts.reduce((total, attempt) => total + computeRetryDelayMs(attempt, defaultPolicy), 0);

      expect(retryWindowMs).toBeGreaterThanOrEqual(3 * 60 * 60 * 1000);
    });
  });
});

describe('The mergeDeliveredChannels() function', () => {
  describe('When channels overlap', () => {
    it('should return each channel once, sorted', () => {
      expect(
        mergeDeliveredChannels([NotificationChannel.Telegram], [NotificationChannel.Expo, NotificationChannel.Telegram])
      ).toStrictEqual([NotificationChannel.Expo, NotificationChannel.Telegram]);
    });
  });
});

describe('The toFailedAttemptState() function', () => {
  describe('When attempts remain', () => {
    it('should increment the attempt, merge the channels and schedule the backoff', () => {
      expect(toFailedAttemptState(pendingState({ attempts: 1 }), [NotificationChannel.Expo], policy, now)).toStrictEqual({
        attempts: 2,
        deliveredChannels: [NotificationChannel.Expo],
        nextAttemptAt: new Date('2026-11-18T22:12:00Z'),
        status: AlertEventNotificationStatus.Pending,
      });
    });
  });

  describe('When the last attempt failed and a channel had delivered', () => {
    it('should stop retrying and count the alert as sent', () => {
      expect(toFailedAttemptState(pendingState({ attempts: 5 }), [NotificationChannel.Expo], policy, now)).toStrictEqual({
        attempts: 6,
        deliveredChannels: [NotificationChannel.Expo],
        nextAttemptAt: null,
        status: AlertEventNotificationStatus.Sent,
      });
    });
  });

  describe('When the last attempt failed and no channel delivered', () => {
    it('should stop retrying and mark the alert failed', () => {
      expect(toFailedAttemptState(pendingState({ attempts: 5 }), [], policy, now).status).toBe(AlertEventNotificationStatus.Failed);
    });
  });
});

describe('The toSentState() function', () => {
  describe('When a pending alert is delivered', () => {
    it('should keep the attempt count, merge the channels and clear the retry', () => {
      expect(
        toSentState(pendingState({ attempts: 2, deliveredChannels: [NotificationChannel.Expo], nextAttemptAt: now }), [NotificationChannel.Telegram])
      ).toStrictEqual({
        attempts: 2,
        deliveredChannels: [NotificationChannel.Expo, NotificationChannel.Telegram],
        nextAttemptAt: null,
        status: AlertEventNotificationStatus.Sent,
      });
    });
  });
});

describe('The toUndeliverableState() function', () => {
  describe('When no channel can reach the user', () => {
    it('should mark the alert failed and clear the retry', () => {
      expect(toUndeliverableState(pendingState({ attempts: 1, nextAttemptAt: now }))).toStrictEqual({
        attempts: 1,
        deliveredChannels: [],
        nextAttemptAt: null,
        status: AlertEventNotificationStatus.Failed,
      });
    });
  });
});
