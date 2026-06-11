export const deleteAccountCooldownSeconds = 5;

type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

export function hasCooldownElapsed(remainingSeconds: number): boolean {
  return remainingSeconds <= 0;
}

export function resolveDeleteAccountCtaLabel(remainingSeconds: number, t: TranslationFunction): string {
  if (hasCooldownElapsed(remainingSeconds)) {
    return t('settings.deleteAccountCta');
  }

  return t('settings.deleteAccountCountdown', { seconds: remainingSeconds });
}
