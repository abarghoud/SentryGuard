jest.mock('expo-linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../core/api', () => ({
  virtualKeyStore: {
    resolveUrl: jest.fn(),
  },
}));

import {
  formatMutedUntilTime,
  formatRelativeAlertTime,
  isMuteActive,
  isVehicleProtected,
  resolveLatestAlert,
  resolveSubtitle,
} from './dashboard.helpers';
import { AlertEvent, AlertEventSeverity, AlertEventType } from '../../features/alerts/domain/entities';
import { Vehicle } from '../../features/vehicles/domain/entities';

describe('The isMuteActive() function', () => {
  describe('When mutedUntil is null or undefined', () => {
    it('should return false for null', () => {
      expect(isMuteActive(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isMuteActive(undefined)).toBe(false);
    });
  });

  describe('When mutedUntil is in the past', () => {
    it('should return false', () => {
      const past = new Date(Date.now() - 60000).toISOString();
      expect(isMuteActive(past)).toBe(false);
    });
  });

  describe('When mutedUntil is an invalid date string', () => {
    it('should return false', () => {
      expect(isMuteActive('invalid-date')).toBe(false);
    });
  });

  describe('When mutedUntil is in the future', () => {
    it('should return true', () => {
      const future = new Date(Date.now() + 60000).toISOString();
      expect(isMuteActive(future)).toBe(true);
    });
  });
});

describe('The formatMutedUntilTime() function', () => {
  describe('When mutedUntil is null or undefined', () => {
    it('should return an empty string for null', () => {
      expect(formatMutedUntilTime(null)).toBe('');
    });

    it('should return an empty string for undefined', () => {
      expect(formatMutedUntilTime(undefined)).toBe('');
    });
  });

  describe('When mutedUntil is invalid', () => {
    it('should return an empty string', () => {
      expect(formatMutedUntilTime('invalid')).toBe('');
    });
  });

  describe('When mutedUntil is on the same day', () => {
    it('should return HH:mm formatted string', () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30);
      expect(formatMutedUntilTime(today.toISOString())).toBe('14:30');
    });
  });

  describe('When mutedUntil is tomorrow', () => {
    it('should return tomorrow localized string when t is provided', () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 30);
      const mockT = (key: string, opts?: Record<string, unknown>) => `${key}:${opts?.time}`;
      expect(formatMutedUntilTime(tomorrow.toISOString(), mockT)).toBe('common.tomorrowAt:14:30');
    });

    it('should return fallback tomorrow string when t is omitted', () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 30);
      expect(formatMutedUntilTime(tomorrow.toISOString())).toBe('demain à 14:30');
    });
  });

  describe('When mutedUntil is in multiple days', () => {
    it('should return date and time localized string when t is provided', () => {
      const now = new Date();
      const future = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 14, 30);
      const mockT = (key: string, opts?: Record<string, unknown>) => `${key}:${opts?.date}@${opts?.time}`;
      const day = future.getDate().toString().padStart(2, '0');
      const month = (future.getMonth() + 1).toString().padStart(2, '0');
      expect(formatMutedUntilTime(future.toISOString(), mockT)).toBe(`common.dateAtTime:${day}/${month}@14:30`);
    });
  });
});

describe('The isVehicleProtected() function', () => {
  describe('When sentry mode monitoring is enabled', () => {
    it('should return true', () => {
      const vehicle = { sentry_mode_monitoring_enabled: true } as Vehicle;
      expect(isVehicleProtected(vehicle)).toBe(true);
    });
  });

  describe('When break-in monitoring is enabled', () => {
    it('should return true', () => {
      const vehicle = { break_in_monitoring_enabled: true, sentry_mode_monitoring_enabled: false } as Vehicle;
      expect(isVehicleProtected(vehicle)).toBe(true);
    });
  });

  describe('When neither is enabled', () => {
    it('should return false', () => {
      const vehicle = { break_in_monitoring_enabled: false, sentry_mode_monitoring_enabled: false } as Vehicle;
      expect(isVehicleProtected(vehicle)).toBe(false);
    });
  });
});

describe('The resolveSubtitle() function', () => {
  const fakeTranslation = (key: string, options?: Record<string, unknown>): string => {
    if (key === 'dashboard.subtitleLoading') return 'loading';
    return `${options?.protectedCount}/${options?.total}`;
  };

  describe('When vehicles list is undefined', () => {
    it('should return the loading subtitle', () => {
      expect(resolveSubtitle(undefined, fakeTranslation)).toBe('loading');
    });
  });

  describe('When vehicles list is provided', () => {
    it('should return protected count over total', () => {
      const vehicles: Vehicle[] = [
        { break_in_monitoring_enabled: true, sentry_mode_monitoring_enabled: true } as Vehicle,
        { break_in_monitoring_enabled: false, sentry_mode_monitoring_enabled: false } as Vehicle,
      ];
      expect(resolveSubtitle(vehicles, fakeTranslation)).toBe('1/2');
    });
  });
});

describe('The resolveLatestAlert() function', () => {
  const createAlert = (id: string, createdAt: string): AlertEvent => ({
    created_at: createdAt,
    id,
    severity: AlertEventSeverity.Warning,
    type: AlertEventType.Sentry,
    vin: '5YJ3E1EA8KF123456',
  });

  describe('When there are no alerts', () => {
    it('should return null for undefined', () => {
      expect(resolveLatestAlert(undefined)).toBeNull();
    });

    it('should return null for an empty list', () => {
      expect(resolveLatestAlert([])).toBeNull();
    });
  });

  describe('When alerts are not sorted by date', () => {
    const olderAlert = createAlert('older', '2026-09-24T10:00:00.000Z');
    const latestAlert = createAlert('latest', '2026-09-25T08:00:00.000Z');
    const middleAlert = createAlert('middle', '2026-09-24T22:00:00.000Z');

    it('should return the most recent alert', () => {
      expect(resolveLatestAlert([olderAlert, latestAlert, middleAlert])).toBe(latestAlert);
    });
  });
});

describe('The formatRelativeAlertTime() function', () => {
  const now = new Date('2026-09-25T12:00:00.000Z').getTime();
  const fakeTranslate = (key: string, options?: Record<string, unknown>): string =>
    options ? `${key}:${String(options.count)}` : key;
  const minutesBefore = (minutes: number): string => new Date(now - minutes * 60000).toISOString();

  describe('When the alert happened less than a minute ago', () => {
    it('should return the just now label', () => {
      expect(formatRelativeAlertTime(minutesBefore(0.5), now, fakeTranslate)).toBe('common.justNow');
    });
  });

  describe('When the alert happened minutes ago', () => {
    it('should return the elapsed minutes', () => {
      expect(formatRelativeAlertTime(minutesBefore(12), now, fakeTranslate)).toBe('common.minutesAgo:12');
    });
  });

  describe('When the alert happened hours ago', () => {
    it('should return the elapsed full hours', () => {
      expect(formatRelativeAlertTime(minutesBefore(150), now, fakeTranslate)).toBe('common.hoursAgo:2');
    });
  });

  describe('When the alert happened days ago', () => {
    it('should return the elapsed full days', () => {
      expect(formatRelativeAlertTime(minutesBefore(3 * 1440 + 30), now, fakeTranslate)).toBe('common.daysAgo:3');
    });
  });

  describe('When the alert date is in the future', () => {
    it('should return the just now label', () => {
      expect(formatRelativeAlertTime(minutesBefore(-5), now, fakeTranslate)).toBe('common.justNow');
    });
  });
});
