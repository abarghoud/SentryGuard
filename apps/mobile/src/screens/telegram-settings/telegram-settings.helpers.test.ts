import { resolveTelegramStatusKey } from './telegram-settings.helpers';

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
