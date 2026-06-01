import { ApiClientRequirements } from '../../../core/api/api-client';
import { TelegramLinkInfo, TelegramStatus, TelegramTestMessageResult } from '../domain/entities';
import { TelegramRepositoryRequirements } from '../domain/telegram.repository.requirements';

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

  public async sendTelegramTestMessage(): Promise<TelegramTestMessageResult> {
    return this.client.request<TelegramTestMessageResult>('/telegram/test-message', {
      method: 'POST',
    });
  }
}
