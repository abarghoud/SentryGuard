import { AlertEventSeverity, AlertEventType } from '../../entities/alert-event.entity';
import { AlertSound } from '../alerts/enums/alert-sound.enum';
import { CounterMeasure } from '../alerts/enums/counter-measure.enum';

export interface PushAlertContext {
  alertSound: AlertSound;
  correlationId?: string;
  detectedAt?: Date;
  severity: AlertEventSeverity;
  type: AlertEventType;
  userId: string;
  userLanguage: 'en' | 'fr';
  vehicleName?: string;
  vin?: string;
}

export interface PushCounterMeasureContext {
  counterMeasures: CounterMeasure[];
  userId: string;
  userLanguage: 'en' | 'fr';
  vehicleName: string;
  vin: string;
}

export interface PushDeliveryResult {
  isDelivered: boolean;
}

export interface NotificationPreferencesDto {
  critical_alerts_enabled: boolean;
  critical_only: boolean;
  muted_until: string | null;
  push_enabled: boolean;
  telegram_enabled: boolean;
}
