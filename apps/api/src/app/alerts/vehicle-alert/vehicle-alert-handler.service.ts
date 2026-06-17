import { Injectable, Logger } from '@nestjs/common';
import { KafkaMessage } from 'kafkajs';
import { randomBytes } from 'crypto';

import { MessageHandler } from '../../messaging/kafka/interfaces/message-handler.interface';
import { TelegramService } from '../../telegram/telegram.service';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { AlertEventType } from '../../../entities/alert-event.entity';
import { RawVehicleAlertMessage, VehicleAlert, VehicleAlertMessage } from './vehicle-alert-message.model';
import { VEHICLE_ALERT_ALLOWLIST, VehicleAlertDefinition } from './vehicle-alert.constants';

@Injectable()
export class VehicleAlertHandlerService implements MessageHandler {
  private readonly logger = new Logger(VehicleAlertHandlerService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly alertNotifier: VehicleAlertNotifierService,
  ) {}

  public async handleMessage(message: KafkaMessage, commit: () => Promise<void>): Promise<void> {
    const alertMessage = this.parseMessage(message);

    if (alertMessage) {
      await this.processAlerts(alertMessage);
    }

    await commit();
  }

  private parseMessage(message: KafkaMessage): VehicleAlertMessage | null {
    const value = message.value?.toString();

    if (!value) {
      this.logger.warn(`Vehicle alert message without content - Offset: ${message.offset}`);
      return null;
    }

    try {
      const alertMessage = new VehicleAlertMessage(JSON.parse(value) as RawVehicleAlertMessage);
      alertMessage.correlationId = `alert-offset-${message.offset}-${randomBytes(4).toString('hex')}`;
      return alertMessage;
    } catch (error) {
      this.logger.error(`Failed to parse vehicle alert message - Offset: ${message.offset}`, error);
      return null;
    }
  }

  private async processAlerts(alertMessage: VehicleAlertMessage): Promise<void> {
    for (const alert of alertMessage.alerts) {
      const definition = VEHICLE_ALERT_ALLOWLIST[alert.name];

      if (definition && alertMessage.isActive(alert)) {
        await this.dispatchAlert(alertMessage, alert, definition);
      }
    }
  }

  private async dispatchAlert(
    alertMessage: VehicleAlertMessage,
    alert: VehicleAlert,
    definition: VehicleAlertDefinition,
  ): Promise<void> {
    this.logger.log(`[VEHICLE_ALERT] ${alert.name} for VIN: ${alertMessage.vin}`);

    await this.alertNotifier.dispatch({
      telemetryMessage: alertMessage,
      alertName: alert.name,
      latencyLabel: 'VEHICLE_ALERT_LATENCY',
      severity: definition.severity,
      telegramNotifier: this.buildTelegramNotifier(definition.type),
      type: definition.type,
    });
  }

  private buildTelegramNotifier(type: AlertEventType) {
    return async (
      userId: string,
      alertInfo: { vin: string; display_name?: string },
      userLanguage: 'en' | 'fr',
    ): Promise<void> => {
      await this.telegramService.sendSecurityAlert(userId, alertInfo, userLanguage, type);
    };
  }
}
