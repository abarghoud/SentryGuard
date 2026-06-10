import { AlertEvent, AlertEventSeverity, AlertEventType } from '../../features/alerts/domain/entities';
import { AlertFilter, filterAlerts, resolveAlertMessageKey, resolveAlertTitleKey } from './alerts.helpers';

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
