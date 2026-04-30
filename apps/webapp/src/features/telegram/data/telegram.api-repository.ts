import { TelegramRepositoryRequirements } from '../domain/telegram.repository.requirements';
import { TelegramLinkInfo, TelegramStatus, TelegramActionResponse } from '../domain/entities';
import { ApiClientRequirements } from '../../../core/api/api-client';

export class TelegramApiRepository implements TelegramRepositoryRequirements {
  constructor(private client: ApiClientRequirements) {}

  async generateTelegramLink(): Promise<TelegramLinkInfo> {
    return this.client.request<TelegramLinkInfo>('/telegram/generate-link', {
      method: 'POST',
    });
  }

  async getTelegramStatus(): Promise<TelegramStatus> {
    return this.client.request<TelegramStatus>('/telegram/status');
  }

  async unlinkTelegram(): Promise<TelegramActionResponse> {
    return this.client.request<TelegramActionResponse>('/telegram/unlink', {
      method: 'DELETE',
    });
  }

  async sendTestMessage(): Promise<TelegramActionResponse> {
    return this.client.request<TelegramActionResponse>('/telegram/test-message', {
      method: 'POST',
    });
  }
}
