export enum AlertEventSeverity {
  Critical = 'critical',
  Warning = 'warning',
}

export enum AlertEventType {
  BreakIn = 'break_in',
  Sentry = 'sentry',
}

export interface AlertEvent {
  created_at: string;
  id: string;
  message: string;
  severity: AlertEventSeverity;
  title: string;
  type: AlertEventType;
  vehicle_display_name?: string | null;
  vin: string;
}
