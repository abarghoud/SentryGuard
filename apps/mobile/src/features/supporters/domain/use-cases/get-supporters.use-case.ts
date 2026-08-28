import { SupportersData } from '../entities';
import { SupportersRepositoryRequirements } from '../supporters.repository.requirements';

export class GetSupportersUseCase {
  public constructor(private readonly repository: SupportersRepositoryRequirements) {}

  public async execute(): Promise<SupportersData> {
    return this.repository.getSupporters();
  }
}
