import {
  TelegramRepositoryRequirements,
  TelegramLinkInfo,
  TelegramStatus,
  TelegramActionResponse,
} from '@sentryguard/telegram-domain';

export class TelegramMockRepository implements TelegramRepositoryRequirements {
  private isLinked = true;

  public async getTelegramStatus(): Promise<TelegramStatus> {
    return {
      linked: this.isLinked,
      message: this.isLinked ? 'Telegram is linked' : 'Telegram is not linked',
      status: this.isLinked ? 'linked' : 'not_configured',
    };
  }

  public async generateTelegramLink(): Promise<TelegramLinkInfo> {
    return {
      expires_at: new Date().toISOString(),
      expires_in_minutes: 10,
      link: 'https://t.me/SentryGuardBot?start=mock-token',
      success: true,
    };
  }

  public async sendTestMessage(): Promise<TelegramActionResponse> {
    return { message: 'Test message sent', success: true };
  }

  public async unlinkTelegram(): Promise<TelegramActionResponse> {
    this.isLinked = false;
    return { message: 'Telegram unlinked', success: true };
  }
}

