export enum AlertEventSeverity {
  Critical = 'critical',
  Warning = 'warning',
}

export enum AlertEventType {
  BreakIn = 'break_in',
  Sentry = 'sentry',
  SustainedPresence = 'sustained_presence',
  SustainedPresenceFinal = 'sustained_presence_final',
  Panic = 'panic',
}

export interface AlertEvent {
  created_at: string;
  id: string;
  severity: AlertEventSeverity;
  type: AlertEventType;
  vehicle_display_name?: string | null;
  vin: string;
}
