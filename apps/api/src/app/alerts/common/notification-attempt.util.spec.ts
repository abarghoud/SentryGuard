import { AlertEventNotificationStatus, NotificationChannel } from '../../../entities/alert-event.entity';
import { AlertNotificationState } from '../interfaces/alert-notification-repository.requirements';
import { toFailedAttemptState, toSentState, toUndeliverableState } from './notification-attempt.util';
import { NotificationRetryPolicy } from './notification-attempt.types';
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
const retryDelayAfterFailure = (attempts: number, retryPolicy: NotificationRetryPolicy): number =>
  (toFailedAttemptState(pendingState({ attempts }), [], retryPolicy, now).nextAttemptAt as Date).getTime() - now.getTime();

describe('The toFailedAttemptState() function', () => {
  describe('When computing the delay after each failed attempt', () => {
    it('should double from the base delay and cap at the maximum delay', () => {
      expect([0, 1, 2, 3, 4].map((attempts) => retryDelayAfterFailure(attempts, policy))).toStrictEqual([
        60_000, 120_000, 240_000, 480_000, 900_000,
      ]);
    });
  });

  describe('When the attempt count is huge', () => {
    it('should still schedule the maximum delay', () => {
      expect(retryDelayAfterFailure(9_999, { ...policy, maxAttempts: 20_000 })).toBe(900_000);
    });
  });

  describe('When using the default retry configuration', () => {
    it('should keep retrying through at least three hours of outage', () => {
      const defaultPolicy = {
        baseDelayMs: NOTIFICATION_RETRY_BASE_DELAY_MS,
        maxAttempts: NOTIFICATION_SWEEP_MAX_ATTEMPTS,
        maxDelayMs: NOTIFICATION_RETRY_MAX_DELAY_MS,
      };
      const previousAttempts = Array.from({ length: defaultPolicy.maxAttempts - 1 }, (_, index) => index);

      const retryWindowMs = previousAttempts.reduce((total, attempts) => total + retryDelayAfterFailure(attempts, defaultPolicy), 0);

      expect(retryWindowMs).toBeGreaterThanOrEqual(3 * 60 * 60 * 1000);
    });
  });

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

  describe('When the channels overlap', () => {
    it('should list each channel once, sorted', () => {
      expect(
        toSentState(pendingState({ deliveredChannels: [NotificationChannel.Telegram] }), [NotificationChannel.Expo, NotificationChannel.Telegram]).deliveredChannels
      ).toStrictEqual([NotificationChannel.Expo, NotificationChannel.Telegram]);
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
