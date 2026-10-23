const mockConstants: { expoConfig: { version?: string } | null } = { expoConfig: null };

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: mockConstants,
}));

import { readAppVersion } from './app-version';

describe('The readAppVersion() function', () => {
  describe('When the app config carries a version', () => {
    beforeEach(() => {
      mockConstants.expoConfig = { version: '1.1.1' };
    });

    it('should return it', () => {
      expect(readAppVersion()).toBe('1.1.1');
    });
  });

  describe('When the app config is not available', () => {
    beforeEach(() => {
      mockConstants.expoConfig = null;
    });

    it('should return null', () => {
      expect(readAppVersion()).toBeNull();
    });
  });
});
