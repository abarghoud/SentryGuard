import { SupportersData } from './entities';

export interface SupportersRepositoryRequirements {
  getSupporters(): Promise<SupportersData>;
}
