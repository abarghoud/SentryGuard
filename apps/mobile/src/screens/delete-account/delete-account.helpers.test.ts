import { deleteAccountCooldownSeconds, hasCooldownElapsed, resolveDeleteAccountCtaLabel } from './delete-account.helpers';

const translate = (key: string, options?: Record<string, unknown>): string =>
  options ? `${key}:${JSON.stringify(options)}` : key;

describe('The hasCooldownElapsed() function', () => {
  describe('When seconds remain', () => {
    it('should not be elapsed', () => {
      expect(hasCooldownElapsed(3)).toBe(false);
    });
  });

  describe('When the countdown reaches zero', () => {
    it('should be elapsed', () => {
      expect(hasCooldownElapsed(0)).toBe(true);
    });
  });
});

describe('The resolveDeleteAccountCtaLabel() function', () => {
  describe('When the cooldown is still running', () => {
    it('should return the countdown label with the remaining seconds', () => {
      expect(resolveDeleteAccountCtaLabel(4, translate)).toBe('settings.deleteAccountCountdown:{"seconds":4}');
    });
  });

  describe('When the cooldown is over', () => {
    it('should return the confirm label', () => {
      expect(resolveDeleteAccountCtaLabel(0, translate)).toBe('settings.deleteAccountCta');
    });
  });
});

describe('The deleteAccountCooldownSeconds constant', () => {
  it('should give the user a visible delay', () => {
    expect(deleteAccountCooldownSeconds).toBeGreaterThanOrEqual(3);
  });
});
