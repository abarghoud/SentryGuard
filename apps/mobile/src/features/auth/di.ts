import { apiClient, tokenStore } from '../../core/api';
import { AuthApiRepository } from './data/auth.api-repository';
import { AuthMockRepository } from './data/auth.mock-repository';
import { AuthRepositoryRequirements } from './domain/auth.repository.requirements';
import { AuthProfile, TeslaLoginResponse, VehicleCommandsAuthorization } from './domain/entities';
import {
  GetAuthProfileUseCase,
  GetTeslaLoginUrlUseCase,
  GetTeslaScopeChangeUrlUseCase,
  GetVehicleCommandsAuthorizationUseCase,
  DemoLoginUseCase,
} from './domain/use-cases/auth.use-cases';

class DynamicAuthRepository implements AuthRepositoryRequirements {
  public constructor(
    private readonly apiRepo: AuthRepositoryRequirements,
    private readonly mockRepo: AuthRepositoryRequirements
  ) {}

  private getRepo(): AuthRepositoryRequirements {
    return tokenStore.isDemo() ? this.mockRepo : this.apiRepo;
  }

  public async getTeslaLoginUrl(redirectUri?: string): Promise<TeslaLoginResponse> {
    return this.getRepo().getTeslaLoginUrl(redirectUri);
  }

  public async getTeslaScopeChangeUrl(missingScopes: string[], redirectUri?: string): Promise<TeslaLoginResponse> {
    return this.getRepo().getTeslaScopeChangeUrl(missingScopes, redirectUri);
  }

  public async getAuthProfile(): Promise<AuthProfile> {
    return this.getRepo().getAuthProfile();
  }

  public async getVehicleCommandsAuthorization(): Promise<VehicleCommandsAuthorization> {
    return this.getRepo().getVehicleCommandsAuthorization();
  }

  public async demoLogin(credentials: { email?: string; password?: string }): Promise<{ jwt: string }> {
    return this.mockRepo.demoLogin(credentials);
  }
}

export const authRepository = new DynamicAuthRepository(
  new AuthApiRepository(apiClient),
  new AuthMockRepository()
);

export const getTeslaLoginUrlUseCase = new GetTeslaLoginUrlUseCase(authRepository);
export const getTeslaScopeChangeUrlUseCase = new GetTeslaScopeChangeUrlUseCase(authRepository);
export const getAuthProfileUseCase = new GetAuthProfileUseCase(authRepository);
export const getVehicleCommandsAuthorizationUseCase = new GetVehicleCommandsAuthorizationUseCase(authRepository);
export const demoLoginUseCase = new DemoLoginUseCase(authRepository);
