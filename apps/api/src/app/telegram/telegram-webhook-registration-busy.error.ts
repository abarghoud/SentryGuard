export class TelegramWebhookRegistrationBusyError extends Error {
  constructor() {
    super('Another instance is registering the Telegram webhook');
    this.name = 'TelegramWebhookRegistrationBusyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
