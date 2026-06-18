import { ConsentStatus, ConsentTextResponse } from '../domain/entities';
import { ConsentRepositoryRequirements } from '../domain/consent.repository.requirements';

export class ConsentMockRepository implements ConsentRepositoryRequirements {
  private hasConsent = true;

  public async getConsentStatus(): Promise<ConsentStatus> {
    return { hasConsent: this.hasConsent };
  }

  public async acceptConsent(): Promise<{ success: boolean }> {
    this.hasConsent = true;
    return { success: true };
  }

  public async getConsentText(locale?: string): Promise<ConsentTextResponse> {
    return {
      appTitle: 'SentryGuard',
      locale: locale || 'en',
      partnerName: 'SentryGuardOrg',
      text: 'Mock consent text description...',
      version: 'v2',
    };
  }

  public async revokeConsent(): Promise<{ success: boolean }> {
    this.hasConsent = false;
    return { success: true };
  }
}
