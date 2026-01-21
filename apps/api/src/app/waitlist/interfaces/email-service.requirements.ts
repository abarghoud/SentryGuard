export const emailServiceRequirementsSymbol = Symbol('EmailServiceRequirements');

export interface EmailServiceRequirements {
  sendEmail(
    to: string,
    subject: string,
    htmlBody: string
  ): Promise<void>;
}
