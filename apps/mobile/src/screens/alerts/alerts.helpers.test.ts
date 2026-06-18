jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Appearance: { setColorScheme: jest.fn() },
  Platform: { OS: 'ios' },
  useColorScheme: jest.fn(),
}));
jest.mock('../../core/theme-storage', () => ({
  getStoredThemeMode: jest.fn(() => Promise.resolve(null)),
  storeThemeMode: jest.fn(() => Promise.resolve()),
}));

import { Alert } from 'react-native';

import { lightColors } from '../../core/theme';
import { AlertEvent, AlertEventSeverity, AlertEventType } from '../../features/alerts/domain/entities';
import {
  AlertFilter,
  confirmClearAlerts,
  countUnreadAlerts,
  filterAlerts,
  isAlertUnread,
  resolveAlertMessageKey,
  resolveAlertTitleKey,
  resolveAlertTone,
} from './alerts.helpers';

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

  describe('When the alert is a sustained presence', () => {
    it('should return the sustained-presence title key', () => {
      expect(resolveAlertTitleKey(createAlert(AlertEventType.SustainedPresence, AlertEventSeverity.Critical))).toBe(
        'alerts.event.sustained_presence.title'
      );
    });
  });

  describe('When the alert is a panic', () => {
    it('should return the panic title key', () => {
      expect(resolveAlertTitleKey(createAlert(AlertEventType.Panic, AlertEventSeverity.Critical))).toBe(
        'alerts.event.panic.title'
      );
    });
  });

  describe('When the alert is a final sustained presence', () => {
    it('should return the final sustained-presence title key', () => {
      expect(resolveAlertTitleKey(createAlert(AlertEventType.SustainedPresenceFinal, AlertEventSeverity.Critical))).toBe(
        'alerts.event.sustained_presence_final.title'
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

  describe('When the alert is a sustained presence', () => {
    it('should return the sustained-presence message key', () => {
      expect(resolveAlertMessageKey(createAlert(AlertEventType.SustainedPresence, AlertEventSeverity.Critical))).toBe(
        'alerts.event.sustained_presence.message'
      );
    });
  });

  describe('When the alert is a panic', () => {
    it('should return the panic message key', () => {
      expect(resolveAlertMessageKey(createAlert(AlertEventType.Panic, AlertEventSeverity.Critical))).toBe(
        'alerts.event.panic.message'
      );
    });
  });

  describe('When the alert is a final sustained presence', () => {
    it('should return the final sustained-presence message key', () => {
      expect(resolveAlertMessageKey(createAlert(AlertEventType.SustainedPresenceFinal, AlertEventSeverity.Critical))).toBe(
        'alerts.event.sustained_presence_final.message'
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

describe('The isAlertUnread() function', () => {
  const alert = createAlert(AlertEventType.Sentry, AlertEventSeverity.Warning);

  describe('When no seen date is stored yet', () => {
    it('should mark the alert as unread', () => {
      expect(isAlertUnread(alert, null)).toBe(true);
    });
  });

  describe('When the alert was created after the last seen date', () => {
    it('should mark the alert as unread', () => {
      expect(isAlertUnread(alert, '2026-06-09T12:00:00.000Z')).toBe(true);
    });
  });

  describe('When the alert was created before the last seen date', () => {
    it('should mark the alert as read', () => {
      expect(isAlertUnread(alert, '2026-06-11T12:00:00.000Z')).toBe(false);
    });
  });

  describe('When the alert was created exactly at the last seen date', () => {
    it('should mark the alert as read', () => {
      expect(isAlertUnread(alert, alert.created_at)).toBe(false);
    });
  });
});

describe('The countUnreadAlerts() function', () => {
  describe('When some alerts are newer than the last seen date', () => {
    it('should count only the unread alerts', () => {
      const readAlert = { ...createAlert(AlertEventType.Sentry, AlertEventSeverity.Warning), created_at: '2026-06-08T12:00:00.000Z' };
      const unreadAlert = createAlert(AlertEventType.BreakIn, AlertEventSeverity.Critical);

      expect(countUnreadAlerts([readAlert, unreadAlert], '2026-06-09T12:00:00.000Z')).toBe(1);
    });
  });
});

describe('The confirmClearAlerts() function', () => {
  const translate = (key: string) => key;
  let onConfirm: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    onConfirm = jest.fn();
    confirmClearAlerts(3, onConfirm, translate);
  });

  describe('When the confirmation dialog opens', () => {
    it('should not clear the alerts yet', () => {
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should show the confirmation title and message', () => {
      expect(Alert.alert).toHaveBeenCalledWith('alerts.clearConfirmTitle', 'alerts.clearConfirmMessage', expect.any(Array));
    });
  });

  describe('When the user confirms the deletion', () => {
    it('should clear the alerts', () => {
      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as { onPress?: () => void; style?: string }[];
      buttons.find((button) => button.style === 'destructive')?.onPress?.();

      expect(onConfirm).toHaveBeenCalled();
    });
  });
});
