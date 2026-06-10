import {
  TelegramRepositoryRequirements,
  TelegramLinkInfo,
  TelegramStatus,
  TelegramActionResponse,
} from '@sentryguard/telegram-domain';
import { ApiClientRequirements } from '../../../core/api/api-client';

export class TelegramApiRepository implements TelegramRepositoryRequirements {
  public constructor(private readonly client: ApiClientRequirements) {}

  public async getTelegramStatus(): Promise<TelegramStatus> {
    return this.client.request<TelegramStatus>('/telegram/status');
  }

  public async generateTelegramLink(): Promise<TelegramLinkInfo> {
    return this.client.request<TelegramLinkInfo>('/telegram/generate-link', {
      method: 'POST',
    });
  }

  public async sendTestMessage(): Promise<TelegramActionResponse> {
    return this.client.request<TelegramActionResponse>('/telegram/test-message', {
      method: 'POST',
    });
  }

  public async unlinkTelegram(): Promise<TelegramActionResponse> {
    return this.client.request<TelegramActionResponse>('/telegram/unlink', {
      method: 'DELETE',
    });
  }
}
