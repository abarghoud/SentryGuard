import { resolveTelegramStatusKey, shouldShowLinkReturnHint } from './telegram-settings.helpers';

describe('The resolveTelegramStatusKey() function', () => {
  describe('When the Telegram account is linked', () => {
    it('should return the linked status key', () => {
      expect(resolveTelegramStatusKey(true)).toBe('telegram.linked');
    });
  });

  describe('When the Telegram account is not linked', () => {
    it('should return the configure status key', () => {
      expect(resolveTelegramStatusKey(false)).toBe('common.toConfigure');
    });
  });
});

describe('The shouldShowLinkReturnHint() function', () => {
  describe('When the user left for Telegram and is not linked yet', () => {
    it('should show the hint', () => {
      expect(shouldShowLinkReturnHint(true, false)).toBe(true);
    });
  });

  describe('When the account got linked', () => {
    it('should hide the hint immediately', () => {
      expect(shouldShowLinkReturnHint(true, true)).toBe(false);
    });
  });

  describe('When no link was generated', () => {
    it('should not show the hint', () => {
      expect(shouldShowLinkReturnHint(false, false)).toBe(false);
    });
  });
});
