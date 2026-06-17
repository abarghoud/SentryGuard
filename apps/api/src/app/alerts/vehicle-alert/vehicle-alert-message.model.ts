import { AlertNotificationSource } from '../common/vehicle-alert-notifier.service';

export interface RawVehicleAlert {
  name?: string;
  audiences?: string[];
  startedAt?: string;
  started_at?: string;
  endedAt?: string | null;
  ended_at?: string | null;
}

export interface RawVehicleAlertMessage {
  vin?: string;
  createdAt?: string;
  created_at?: string;
  correlationId?: string;
  alerts?: RawVehicleAlert[];
}

export interface VehicleAlert {
  name: string;
  audiences: string[];
  startedAt?: string;
  endedAt?: string | null;
}

export class VehicleAlertMessage implements AlertNotificationSource {
  public readonly vin: string;
  public readonly createdAt: string;
  public readonly alerts: VehicleAlert[];
  public correlationId?: string;

  constructor(raw: RawVehicleAlertMessage) {
    this.vin = raw.vin ?? 'unknown';
    this.createdAt = raw.createdAt ?? raw.created_at ?? new Date(0).toISOString();
    this.correlationId = raw.correlationId;
    this.alerts = (raw.alerts ?? []).map(alert => this.normalizeAlert(alert));
  }

  public isActive(alert: VehicleAlert): boolean {
    return alert.endedAt === undefined || alert.endedAt === null;
  }

  public calculateEndToEndLatency(): number | null {
    if (!this.createdAt || !this.correlationId) {
      return null;
    }

    try {
      return Date.now() - new Date(this.createdAt).getTime();
    } catch {
      return null;
    }
  }

  public isProcessingDelayed(processingTimeMs: number, thresholdMs = 1000): boolean {
    return processingTimeMs > thresholdMs;
  }

  private normalizeAlert(alert: RawVehicleAlert): VehicleAlert {
    return {
      name: alert.name ?? '',
      audiences: alert.audiences ?? [],
      startedAt: alert.startedAt ?? alert.started_at,
      endedAt: alert.endedAt ?? alert.ended_at,
    };
  }
}
