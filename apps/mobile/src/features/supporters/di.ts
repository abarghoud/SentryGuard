import { apiClient, tokenStore } from '../../core/api';
import { SupportersApiRepository } from './data/supporters.api-repository';
import { SupportersMockRepository } from './data/supporters.mock-repository';
import { SupportersData } from './domain/entities';
import { SupportersRepositoryRequirements } from './domain/supporters.repository.requirements';
import { GetSupportersUseCase } from './domain/use-cases/get-supporters.use-case';

class DynamicSupportersRepository implements SupportersRepositoryRequirements {
  public constructor(
    private readonly apiRepo: SupportersRepositoryRequirements,
    private readonly mockRepo: SupportersRepositoryRequirements
  ) {}

  private getRepo(): SupportersRepositoryRequirements {
    return tokenStore.isDemo() ? this.mockRepo : this.apiRepo;
  }

  public async getSupporters(): Promise<SupportersData> {
    return this.getRepo().getSupporters();
  }
}

export const supportersRepository = new DynamicSupportersRepository(
  new SupportersApiRepository(apiClient),
  new SupportersMockRepository()
);

export const getSupportersUseCase = new GetSupportersUseCase(supportersRepository);
