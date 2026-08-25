import { Injectable } from '@nestjs/common';

import { TelemetryEventHandler } from '../../telemetry/interfaces/telemetry-event-handler.interface';
import { SentryModeState, TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';

@Injectable()
export class SentryAlertHandlerService implements TelemetryEventHandler {
  constructor(
    private readonly alertNotifier: VehicleAlertNotifierService,
  ) {}

  async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    const sentryMode = telemetryMessage.getSentryModeState();

    if (sentryMode === SentryModeState.Aware) {
      await this.alertNotifier.dispatch({
        telemetryMessage,
        alertName: 'SENTRY_ALERT',
        latencyLabel: 'SENTRY_LATENCY',
        severity: AlertEventSeverity.Warning,
        type: AlertEventType.Sentry,
      });
    }
  }
}
