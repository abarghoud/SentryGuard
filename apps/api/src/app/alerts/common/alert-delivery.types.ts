import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { ChannelOutcomeStatus } from './channel-outcome-status.enum';

export interface AlertDispatchConfig {
  telemetryMessage: TelemetryMessage;
  alertName: string;
  latencyLabel: string;
  reactionDelayMs?: number;
  severity: AlertEventSeverity;
  type: AlertEventType;
}

export interface ChannelOutcome {
  error?: unknown;
  status: ChannelOutcomeStatus;
}

export interface DeliveryOutcomes {
  expo: ChannelOutcome;
  telegram: ChannelOutcome;
}
