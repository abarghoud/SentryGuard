jest.mock('react-native', () => ({
  Appearance: { setColorScheme: jest.fn() },
  Platform: { OS: 'ios' },
  useColorScheme: jest.fn(),
}));
jest.mock('../../core/theme-storage', () => ({
  getStoredThemeMode: jest.fn(() => Promise.resolve(null)),
  storeThemeMode: jest.fn(() => Promise.resolve()),
}));

import { lightColors } from '../../core/theme';
import { AlertEvent, AlertEventSeverity, AlertEventType } from '../../features/alerts/domain/entities';
import { AlertFilter, filterAlerts, resolveAlertMessageKey, resolveAlertTitleKey, resolveAlertTone } from './alerts.helpers';

const createAlert = (type: AlertEventType, severity: AlertEventSeverity): AlertEvent => ({
  created_at: '2026-06-10T12:00:00.000Z',
  id: `alert-${type}`,
  severity,
  type,
  vehicle_display_name: 'My Tesla',
  vin: 'VIN12345678901234',
});

describe('The resolveAlertTitleKey() function', () => {
  describe('When the alert is a break-in', () => {
    it('should return the break-in title key', () => {
      expect(resolveAlertTitleKey(createAlert(AlertEventType.BreakIn, AlertEventSeverity.Critical))).toBe(
        'alerts.event.break_in.title'
      );
    });
  });

  describe('When the alert is a Sentry event', () => {
    it('should return the sentry title key', () => {
      expect(resolveAlertTitleKey(createAlert(AlertEventType.Sentry, AlertEventSeverity.Warning))).toBe(
        'alerts.event.sentry.title'
      );
    });
  });
});

describe('The resolveAlertMessageKey() function', () => {
  describe('When the alert is a break-in', () => {
    it('should return the break-in message key', () => {
      expect(resolveAlertMessageKey(createAlert(AlertEventType.BreakIn, AlertEventSeverity.Critical))).toBe(
        'alerts.event.break_in.message'
      );
    });
  });

  describe('When the alert is a Sentry event', () => {
    it('should return the sentry message key', () => {
      expect(resolveAlertMessageKey(createAlert(AlertEventType.Sentry, AlertEventSeverity.Warning))).toBe(
        'alerts.event.sentry.message'
      );
    });
  });
});

describe('The resolveAlertTone() function', () => {
  describe('When the alert is critical', () => {
    it('should use the destructive red with a contrasting icon', () => {
      expect(resolveAlertTone(createAlert(AlertEventType.BreakIn, AlertEventSeverity.Critical), lightColors)).toStrictEqual({
        background: lightColors.criticalFill,
        icon: lightColors.onCritical,
      });
    });
  });

  describe('When the alert is a warning', () => {
    it('should use the alert amber with a contrasting icon', () => {
      expect(resolveAlertTone(createAlert(AlertEventType.Sentry, AlertEventSeverity.Warning), lightColors)).toStrictEqual({
        background: lightColors.warningFill,
        icon: lightColors.onWarning,
      });
    });
  });
});

describe('The filterAlerts() function', () => {
  const criticalAlert = createAlert(AlertEventType.BreakIn, AlertEventSeverity.Critical);
  const warningAlert = createAlert(AlertEventType.Sentry, AlertEventSeverity.Warning);

  describe('When the filter is critical', () => {
    it('should keep only critical alerts', () => {
      expect(filterAlerts([criticalAlert, warningAlert], AlertFilter.Critical)).toStrictEqual([criticalAlert]);
    });
  });

  describe('When the filter is warning', () => {
    it('should keep only warning alerts', () => {
      expect(filterAlerts([criticalAlert, warningAlert], AlertFilter.Warning)).toStrictEqual([warningAlert]);
    });
  });

  describe('When the filter is all', () => {
    it('should keep every alert', () => {
      expect(filterAlerts([criticalAlert, warningAlert], AlertFilter.All)).toStrictEqual([criticalAlert, warningAlert]);
    });
  });
});
