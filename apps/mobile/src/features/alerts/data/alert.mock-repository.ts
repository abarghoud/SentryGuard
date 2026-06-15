import { AlertEvent, AlertEventSeverity, AlertEventType } from '../domain/entities';
import { AlertRepositoryRequirements } from '../domain/alert.repository.requirements';

export class AlertMockRepository implements AlertRepositoryRequirements {
  private alerts: AlertEvent[] = [
    {
      id: 'alert-sentry-id',
      created_at: new Date().toISOString(),
      severity: AlertEventSeverity.Warning,
      type: AlertEventType.Sentry,
      vehicle_display_name: 'Model 3 - Demo',
      vin: '5YJ3E1EA8KF123456',
    },
    {
      id: 'alert-break-in-id',
      created_at: new Date(Date.now() - 60000).toISOString(),
      severity: AlertEventSeverity.Critical,
      type: AlertEventType.BreakIn,
      vehicle_display_name: 'Model 3 - Demo',
      vin: '5YJ3E1EA8KF123456',
    },
  ];

  public async getAlerts(): Promise<AlertEvent[]> {
    return [...this.alerts];
  }

  public async deleteAlert(alertId: string): Promise<{ success: boolean }> {
    this.alerts = this.alerts.filter((alert) => alert.id !== alertId);
    return { success: true };
  }

  public async clearAlerts(): Promise<{ success: boolean }> {
    this.alerts = [];
    return { success: true };
  }
}
