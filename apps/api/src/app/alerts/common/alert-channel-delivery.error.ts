import { NotificationChannel } from '../../../entities/alert-event.entity';

export class AlertChannelDeliveryError extends Error {
  constructor(
    message: string,
    public readonly deliveredChannels: NotificationChannel[]
  ) {
    super(message);
    this.name = 'AlertChannelDeliveryError';
  }
}
