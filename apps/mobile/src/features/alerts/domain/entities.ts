export enum AlertEventSeverity {
  Critical = 'critical',
  Warning = 'warning',
}

export enum AlertEventType {
  BreakIn = 'break_in',
  Sentry = 'sentry',
  Alarm = 'alarm',
  IntrusionAttempt = 'intrusion_attempt',
}

export interface AlertEvent {
  created_at: string;
  id: string;
  severity: AlertEventSeverity;
  type: AlertEventType;
  vehicle_display_name?: string | null;
  vin: string;
}
