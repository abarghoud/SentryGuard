import { Injectable, Logger } from '@nestjs/common';

import { KafkaLogContextService } from '../../../common/services/kafka-log-context.service';
import { AlertEventSeverity } from '../../../entities/alert-event.entity';
import { Vehicle } from '../../../entities/vehicle.entity';
import { resolveVehicleLabel } from '../../../common/utils/vehicle-label.util';
import { NotificationQueueService } from '../../notifications/notification-queue.service';
import { NotificationsService, PushDeliveryResult } from '../../notifications/notifications.service';
import { TelegramDeliveryResult, TelegramService } from '../../telegram/telegram.service';
import { UserLanguageService } from '../../user/user-language.service';
import { CounterMeasure } from '../enums/counter-measure.enum';

export type CounterMeasureNoticeRecipient = Pick<Vehicle, 'display_name' | 'userId' | 'vin'>;

type ChannelOutcome = PromiseSettledResult<PushDeliveryResult | TelegramDeliveryResult>;

const isDelivered = (outcome: ChannelOutcome): boolean => outcome.status === 'fulfilled' && outcome.value.isDelivered;

interface CounterMeasureNotice {
  counterMeasures: CounterMeasure[];
  displayName?: string;
  userId: string;
  userLanguage: 'en' | 'fr';
  vin: string;
}

@Injectable()
export class CounterMeasureNotifierService {
  private readonly logger = new Logger(CounterMeasureNotifierService.name);

  constructor(
    private readonly userLanguageService: UserLanguageService,
    private readonly notificationsService: NotificationsService,
    private readonly telegramService: TelegramService,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly kafkaLogContextService: KafkaLogContextService
  ) {}

  public notify(vin: string, recipients: CounterMeasureNoticeRecipient[], counterMeasures: CounterMeasure[], correlationId?: string): void {
    const logContext = { correlationId: correlationId ?? `counter-measure-notice-${vin}`, vin };

    for (const recipient of recipients) {
      this.notificationQueueService.enqueue(
        () => this.kafkaLogContextService.runWithContext(logContext, () => this.notifyUser(recipient, counterMeasures)),
        { correlationId, label: `counter_measure_notice:${recipient.userId}`, vin }
      );
    }
  }

  private async notifyUser(recipient: CounterMeasureNoticeRecipient, counterMeasures: CounterMeasure[]): Promise<void> {
    const notice = await this.buildNotice(recipient, counterMeasures);
    const [push, telegram] = await Promise.allSettled([this.sendPush(notice), this.sendTelegram(notice)]);

    this.logOutcome(notice, { push, telegram });
  }

  private logOutcome(notice: CounterMeasureNotice, results: Record<string, ChannelOutcome>): void {
    const subject = `user ${notice.userId} for VIN ${notice.vin}`;
    const deliveredChannels = this.listChannels(results, isDelivered);
    const failedChannels = this.listChannels(results, result => result.status === 'rejected');

    if (failedChannels.length > 0) {
      this.logger.warn(`[COUNTER_MEASURE_NOTICE] Failed to notify ${subject} over ${failedChannels.join(', ')}`);
    }

    if (deliveredChannels.length > 0) {
      this.logger.log(`[COUNTER_MEASURE_NOTICE] Notified ${subject} over ${deliveredChannels.join(', ')}: ${notice.counterMeasures.join(', ')}`);
    } else if (failedChannels.length === 0) {
      this.logger.log(`[COUNTER_MEASURE_NOTICE] No channel delivered the notice to ${subject}`);
    }
  }

  private listChannels(
    results: Record<string, ChannelOutcome>,
    matches: (outcome: ChannelOutcome) => boolean
  ): string[] {
    return Object.keys(results).filter(channel => matches(results[channel]));
  }

  private async buildNotice(recipient: CounterMeasureNoticeRecipient, counterMeasures: CounterMeasure[]): Promise<CounterMeasureNotice> {
    const userLanguage = await this.userLanguageService.getUserLanguage(recipient.userId);

    return { counterMeasures, displayName: recipient.display_name, userId: recipient.userId, userLanguage, vin: recipient.vin };
  }

  private async sendPush(notice: CounterMeasureNotice): Promise<PushDeliveryResult> {
    return await this.notificationsService.sendCounterMeasurePush({
      counterMeasures: notice.counterMeasures,
      userId: notice.userId,
      userLanguage: notice.userLanguage,
      vehicleName: resolveVehicleLabel(notice.displayName, notice.vin),
      vin: notice.vin,
    });
  }

  private async sendTelegram(notice: CounterMeasureNotice): Promise<TelegramDeliveryResult> {
    if (!(await this.notificationsService.shouldSendTelegram(notice.userId, AlertEventSeverity.Warning))) {
      return { isDelivered: false };
    }

    return await this.telegramService.sendCounterMeasureNotice(
      notice.userId,
      { display_name: notice.displayName, vin: notice.vin },
      notice.userLanguage,
      notice.counterMeasures
    );
  }
}
