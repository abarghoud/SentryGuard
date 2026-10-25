import { SettingsPage, resolveSettingsPageRoute } from './settings-page.helpers';

describe('The resolveSettingsPageRoute() function', () => {
  describe('When the Telegram page is opened', () => {
    it('should push the Telegram settings screen', () => {
      expect(resolveSettingsPageRoute(SettingsPage.Telegram)).toBe('TelegramSettings');
    });
  });

  describe('When the account deletion page is opened', () => {
    it('should push the account deletion screen', () => {
      expect(resolveSettingsPageRoute(SettingsPage.DeleteAccount)).toBe('DeleteAccount');
    });
  });
});
