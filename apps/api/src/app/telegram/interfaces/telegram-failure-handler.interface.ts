export const telegramFailureHandler = Symbol('TelegramFailureHandler');

export interface ITelegramFailureHandler {
  canHandle(error: Error): boolean;
  handleFailure(error: Error, userId: string): Promise<void>;
}