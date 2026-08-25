jest.mock('expo-linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  sendIntent: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'android' },
  Share: { share: jest.fn(() => Promise.resolve()) },
}));
jest.mock('../../core/api', () => ({
  virtualKeyStore: { resolveDomain: jest.fn(() => '') },
}));
jest.mock('../../core/logging', () => ({
  appLogger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
  buildLogsExportFileName: jest.fn(() => 'logs.txt'),
  writeLogsExportFile: jest.fn(() => Promise.resolve('/tmp/logs.txt')),
}));
jest.mock('../../features/notifications/di', () => ({
  dndPolicyAccess: {
    isNotificationPolicyAccessGranted: jest.fn(() => Promise.resolve(false)),
  },
  pushNotificationService: {
    configure: jest.fn(() => Promise.resolve()),
    getCachedExpoPushToken: jest.fn(() => Promise.resolve(null)),
    requestExpoPushToken: jest.fn(() => Promise.resolve(null)),
  },
  registerPushTokenUseCase: {
    execute: jest.fn(() => Promise.resolve({ success: true })),
  },
}));

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import {
  buildCrispChatUrl,
  openCrispSupport,
  openDiscordCommunity,
  openEmailSupport,
  resolveAvailablePushToken,
  resolveCrispWebsiteId,
  resolveDiscordUrl,
  resolveSupportEmail,
} from './settings.helpers';

describe('The resolveAvailablePushToken() function', () => {
  describe('When the current push token is already resolved', () => {
    it('should return the current push token', async () => {
      await expect(resolveAvailablePushToken('fresh-token', { push_enabled: false })).resolves.toBe('fresh-token');
    });
  });

  describe('When push is disabled before the current token is resolved', () => {
    it('should return the cached push token', async () => {
      await expect(resolveAvailablePushToken(null, { push_enabled: false }, async () => 'cached-token')).resolves.toBe(
        'cached-token'
      );
    });
  });

  describe('When push is enabled before the current token is resolved', () => {
    it('should not return the cached push token', async () => {
      await expect(
        resolveAvailablePushToken(null, { push_enabled: true }, async () => 'cached-token')
      ).resolves.toBeUndefined();
    });
  });
});

describe('The resolveCrispWebsiteId() function', () => {
  const originalEnv = process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID;

  afterEach(() => {
    process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID = originalEnv;
  });

  describe('When EXPO_PUBLIC_CRISP_WEBSITE_ID is not configured', () => {
    it('should return undefined', () => {
      delete process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID;
      expect(resolveCrispWebsiteId()).toBeUndefined();
    });
  });

  describe('When EXPO_PUBLIC_CRISP_WEBSITE_ID contains invalid characters', () => {
    it('should return undefined', () => {
      process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID = 'test-id<script>';
      expect(resolveCrispWebsiteId()).toBeUndefined();
    });
  });

  describe('When EXPO_PUBLIC_CRISP_WEBSITE_ID is configured', () => {
    it('should return the configured website id', () => {
      process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID = 'test-id';
      expect(resolveCrispWebsiteId()).toBe('test-id');
    });
  });
});

describe('The resolveDiscordUrl() function', () => {
  const originalEnv = process.env.EXPO_PUBLIC_DISCORD_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_DISCORD_URL = originalEnv;
  });

  describe('When EXPO_PUBLIC_DISCORD_URL is not configured', () => {
    it('should return undefined', () => {
      delete process.env.EXPO_PUBLIC_DISCORD_URL;
      expect(resolveDiscordUrl()).toBeUndefined();
    });
  });

  describe('When EXPO_PUBLIC_DISCORD_URL has an invalid scheme', () => {
    it('should return undefined', () => {
      process.env.EXPO_PUBLIC_DISCORD_URL = 'javascript:alert(1)';
      expect(resolveDiscordUrl()).toBeUndefined();
    });
  });

  describe('When EXPO_PUBLIC_DISCORD_URL is configured', () => {
    it('should return the configured discord url', () => {
      process.env.EXPO_PUBLIC_DISCORD_URL = 'https://discord.gg/test';
      expect(resolveDiscordUrl()).toBe('https://discord.gg/test');
    });
  });
});

describe('The resolveSupportEmail() function', () => {
  const originalEnv = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL = originalEnv;
  });

  describe('When EXPO_PUBLIC_SUPPORT_EMAIL is not configured', () => {
    it('should return undefined', () => {
      delete process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
      expect(resolveSupportEmail()).toBeUndefined();
    });
  });

  describe('When EXPO_PUBLIC_SUPPORT_EMAIL has an invalid format', () => {
    it('should return undefined', () => {
      process.env.EXPO_PUBLIC_SUPPORT_EMAIL = 'invalid-email';
      expect(resolveSupportEmail()).toBeUndefined();
    });
  });

  describe('When EXPO_PUBLIC_SUPPORT_EMAIL is configured', () => {
    it('should return the configured email', () => {
      process.env.EXPO_PUBLIC_SUPPORT_EMAIL = 'help@example.com';
      expect(resolveSupportEmail()).toBe('help@example.com');
    });
  });
});

describe('The buildCrispChatUrl() function', () => {
  const originalEnv = process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID;

  afterEach(() => {
    process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID = originalEnv;
  });

  describe('When crisp website id is not configured', () => {
    it('should return null', () => {
      delete process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID;
      expect(buildCrispChatUrl()).toBeNull();
    });
  });

  describe('When crisp website id is configured', () => {
    it('should build the Crisp embed URL', () => {
      process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID = 'test-id';
      expect(buildCrispChatUrl()).toBe('https://go.crisp.chat/chat/embed/?website_id=test-id');
    });
  });

  describe('When user email and name are provided', () => {
    it('should include user parameters in the Crisp embed URL', () => {
      process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID = 'test-id';
      const url = buildCrispChatUrl('test@example.com', 'Alex');
      expect(url).toContain('user_email=test%40example.com');
      expect(url).toContain('user_nickname=Alex');
    });
  });
});

describe('The openCrispSupport() function', () => {
  const originalEnv = process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID;

  afterEach(() => {
    process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID = originalEnv;
    jest.clearAllMocks();
  });

  describe('When crisp website id is not configured', () => {
    it('should not open browser', async () => {
      delete process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID;
      await openCrispSupport();
      expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    });
  });

  describe('When crisp website id is configured', () => {
    it('should open browser with the Crisp chat URL', async () => {
      process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID = 'test-id';
      await openCrispSupport('test@example.com', 'Alex');
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        expect.stringContaining('https://go.crisp.chat/chat/embed/?website_id=test-id')
      );
    });
  });
});

describe('The openDiscordCommunity() function', () => {
  const originalEnv = process.env.EXPO_PUBLIC_DISCORD_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_DISCORD_URL = originalEnv;
    jest.clearAllMocks();
  });

  describe('When discord URL is not configured', () => {
    it('should not open URL', async () => {
      delete process.env.EXPO_PUBLIC_DISCORD_URL;
      await openDiscordCommunity();
      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });

  describe('When discord URL is configured', () => {
    it('should open the Discord invite URL', async () => {
      process.env.EXPO_PUBLIC_DISCORD_URL = 'https://discord.gg/custom';
      await openDiscordCommunity();
      expect(Linking.openURL).toHaveBeenCalledWith('https://discord.gg/custom');
    });
  });
});

describe('The openEmailSupport() function', () => {
  const originalEnv = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL = originalEnv;
    jest.clearAllMocks();
  });

  describe('When support email is not configured', () => {
    it('should not open URL', async () => {
      delete process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
      await openEmailSupport('Test');
      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });

  describe('When support email is configured', () => {
    it('should open mail client with encoded subject', async () => {
      process.env.EXPO_PUBLIC_SUPPORT_EMAIL = 'contact@example.com';
      await openEmailSupport('Test Subject');
      expect(Linking.openURL).toHaveBeenCalledWith('mailto:contact@example.com?subject=Test%20Subject');
    });
  });
});
