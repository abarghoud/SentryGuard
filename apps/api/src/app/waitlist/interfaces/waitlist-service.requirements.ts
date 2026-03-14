export const waitlistServiceRequirementsSymbol = Symbol(
  'WaitlistServiceRequirements'
);

export interface WaitlistServiceRequirements {
  isApproved(email: string): Promise<boolean>;
  addToWaitlist(
    email: string,
    fullName: string | undefined,
    preferredLanguage: string
  ): Promise<void>;
}