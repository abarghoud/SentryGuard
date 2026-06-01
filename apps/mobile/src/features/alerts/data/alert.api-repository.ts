import { ApiClientRequirements } from '../../../core/api/api-client';
import { AlertEvent } from '../domain/entities';
import { AlertRepositoryRequirements } from '../domain/alert.repository.requirements';

export class AlertApiRepository implements AlertRepositoryRequirements {
  public constructor(private readonly client: ApiClientRequirements) {}

  public async getAlerts(): Promise<AlertEvent[]> {
    return this.client.request<AlertEvent[]>('/alerts');
  }

  public async clearAlerts(): Promise<{ success: boolean }> {
    return this.client.request<{ success: boolean }>('/alerts', { method: 'DELETE' });
  }
}
