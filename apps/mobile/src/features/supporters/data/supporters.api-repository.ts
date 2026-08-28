import { ApiClientRequirements } from '../../../core/api/api-client';
import { SupportersData } from '../domain/entities';
import { SupportersRepositoryRequirements } from '../domain/supporters.repository.requirements';

export class SupportersApiRepository implements SupportersRepositoryRequirements {
  public constructor(private readonly client: ApiClientRequirements) {}

  public async getSupporters(): Promise<SupportersData> {
    return this.client.request<SupportersData>('/supporters');
  }
}
