import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';

export interface VehicleAlertDefinition {
  type: AlertEventType;
  severity: AlertEventSeverity;
}

/**
 * Tesla Vehicle Alert names (audience: service) mapped to SentryGuard alert types.
 * Derived from the Tesla alert dictionary; to be confirmed empirically on a test
 * vehicle before relying on it in production.
 */
export const VEHICLE_ALERT_ALLOWLIST: Readonly<
  Record<string, VehicleAlertDefinition>
> = {
  VCSEC_a133_alarmTriggered: {
    type: AlertEventType.Alarm,
    severity: AlertEventSeverity.Critical,
  },
  BCCEN_w095_AlarmTriggered: {
    type: AlertEventType.Alarm,
    severity: AlertEventSeverity.Critical,
  },
  VCSEC_a211_handlePullWithoutAuth: {
    type: AlertEventType.IntrusionAttempt,
    severity: AlertEventSeverity.Critical,
  },
};
