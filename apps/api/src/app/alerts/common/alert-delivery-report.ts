import { NotificationChannel } from '../enums/notification-channel.enum';
import { CaughtError } from '../../../common/utils/caught-error';
import { ChannelOutcome, DeliveryOutcomes } from './alert-delivery.types';
import { ChannelOutcomeStatus } from './channel-outcome-status.enum';

export class AlertDeliveryReport {
  public readonly failedChannels: NotificationChannel[];
  public readonly hasDelivered: boolean;
  public readonly newlyDelivered: NotificationChannel[];

  public constructor(private readonly outcomes: DeliveryOutcomes, alreadyDelivered: ReadonlySet<NotificationChannel>) {
    this.failedChannels = this.findChannelsWithStatus(ChannelOutcomeStatus.Failed);
    this.newlyDelivered = this.findChannelsWithStatus(ChannelOutcomeStatus.Delivered);
    this.hasDelivered = alreadyDelivered.size > 0 || this.newlyDelivered.length > 0;
  }

  public describeChannels(): string {
    return `{expo:${this.describeOutcome(this.outcomes.expo)}, telegram:${this.describeOutcome(this.outcomes.telegram)}}`;
  }

  private findChannelsWithStatus(status: ChannelOutcomeStatus): NotificationChannel[] {
    return this.toChannelEntries()
      .filter(([, outcome]) => outcome.status === status)
      .map(([channel]) => channel);
  }

  private toChannelEntries(): Array<[NotificationChannel, ChannelOutcome]> {
    return [
      [NotificationChannel.Expo, this.outcomes.expo],
      [NotificationChannel.Telegram, this.outcomes.telegram],
    ];
  }

  private describeOutcome(outcome: ChannelOutcome): string {
    switch (outcome.status) {
      case ChannelOutcomeStatus.AlreadyDelivered:
        return 'ok(earlier)';
      case ChannelOutcomeStatus.Delivered:
        return 'ok';
      case ChannelOutcomeStatus.Skipped:
        return 'none';
      case ChannelOutcomeStatus.Failed:
        return new CaughtError(outcome.error).summarizeReason();
    }
  }
}
