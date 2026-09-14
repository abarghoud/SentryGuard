export interface NotificationPreferences {
  critical_alerts_enabled: boolean;
  critical_only: boolean;
  muted_until: string | null;
  push_enabled: boolean;
  telegram_enabled: boolean;
}
