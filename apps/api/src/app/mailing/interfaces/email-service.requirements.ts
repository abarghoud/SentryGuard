export const emailServiceRequirementsSymbol = Symbol('EmailServiceRequirements');

export interface EmailServiceRequirements {
  sendTemplateEmail(
    to: string,
    templateKey: string,
    mergeInfo: Record<string, string>
  ): Promise<void>;
}
