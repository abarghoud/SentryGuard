import { AuthRepositoryRequirements } from '../domain/auth.repository.requirements';
import { AuthProfile, TeslaLoginResponse, VehicleCommandsAuthorization } from '../domain/entities';

export class AuthMockRepository implements AuthRepositoryRequirements {
  public async getTeslaLoginUrl(): Promise<TeslaLoginResponse> {
    return { message: 'success', state: 'mock-state', url: 'mock-url' };
  }

  public async getTeslaScopeChangeUrl(): Promise<TeslaLoginResponse> {
    return { message: 'success', state: 'mock-state', url: 'mock-url' };
  }

  public async getAuthProfile(): Promise<AuthProfile> {
    return {
      profile: {
        email: 'demo@sentryguard.test',
        full_name: 'Apple Reviewer',
        isBetaTester: true,
        userId: 'demo-user-id',
      },
      success: true,
    };
  }

  public async getVehicleCommandsAuthorization(): Promise<VehicleCommandsAuthorization> {
    return { authorized: true };
  }

  public async demoLogin(credentials: { email?: string; password?: string }): Promise<{ jwt: string }> {
    const email = process.env.EXPO_PUBLIC_DEMO_EMAIL;
    const pwd = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
    if (!email || !pwd || credentials.email !== email || credentials.password !== pwd) {
      throw new Error('Invalid or unconfigured demo credentials');
    }
    return { jwt: 'demo-token' };
  }
}
