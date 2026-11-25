import { NotificationChannel } from '../enums/notification-channel.enum';

export class AlertChannelDeliveryError extends Error {
  constructor(
    message: string,
    public readonly deliveredChannels: NotificationChannel[]
  ) {
    super(message);
    this.name = 'AlertChannelDeliveryError';
  }
}
