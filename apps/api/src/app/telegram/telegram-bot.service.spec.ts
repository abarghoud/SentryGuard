import * as https from 'https';
import { Telegraf, Telegram } from 'telegraf';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramWebhookRegistrationService } from './telegram-webhook-registration.service';

const freshCallApi = jest.fn();
const registerUntilReady = jest.fn();
const webhookRegistration = { registerUntilReady } as unknown as TelegramWebhookRegistrationService;

jest.mock('telegraf', () => ({
  Telegraf: jest.fn().mockImplementation(() => ({ telegram: {} })),
  Telegram: jest.fn().mockImplementation(() => ({ callApi: freshCallApi })),
}));

interface AgentInternals {
  keepAlive: boolean;
  maxSockets: number;
  options: { family?: number };
}

describe('The TelegramBotService class', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = '000000:FAKE_TOKEN';
    delete process.env.TELEGRAM_WEBHOOK_BASE;
    delete process.env.TELEGRAM_MODE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.mocked(Telegraf).mockClear();
    jest.mocked(Telegram).mockClear();
    freshCallApi.mockReset();
    registerUntilReady.mockReset();
  });

  describe('The onModuleInit() method', () => {
    describe('When a bot token is configured', () => {
      it('should create the Telegraf client with an IPv4-only agent that never keeps connections alive', async () => {
        const service = new TelegramBotService(webhookRegistration);

        await service.onModuleInit();

        const [, options] = jest.mocked(Telegraf).mock.calls[0];
        const agent = options?.telegram?.agent as unknown as AgentInternals;
        expect({ family: agent.options.family, keepAlive: agent.keepAlive }).toStrictEqual({ family: 4, keepAlive: false });
      });

      it('should not cap the shared sockets, so hung bot replies cannot hold up alerts', async () => {
        const service = new TelegramBotService(webhookRegistration);

        await service.onModuleInit();

        const [, options] = jest.mocked(Telegraf).mock.calls[0];
        expect((options?.telegram?.agent as unknown as AgentInternals).maxSockets).toBe(Infinity);
      });
    });
  });

  describe('When the bot runs in webhook mode', () => {
    const fakeSecretPath = 'fake-secret-path-0123456789';
    const fakeSecretToken = 'fake-secret-token-0123456789abcdef';
    let callApi: jest.Mock;
    let bot: { botInfo?: { username: string }; telegram: { callApi: jest.Mock }; webhookCallback: jest.Mock };
    let service: TelegramBotService;

    beforeEach(() => {
      process.env.TELEGRAM_WEBHOOK_BASE = 'https://api.example.test/';
      process.env.TELEGRAM_WEBHOOK_SECRET_PATH = fakeSecretPath;
      process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN = fakeSecretToken;
      callApi = jest.fn();
      bot = { telegram: { callApi }, webhookCallback: jest.fn() };
      jest.mocked(Telegraf).mockImplementationOnce(() => bot as never);
      service = new TelegramBotService(webhookRegistration);
    });

    describe('When the module starts', () => {
      beforeEach(async () => {
        registerUntilReady.mockImplementation(async (registeredBot: typeof bot) => {
          registeredBot.botInfo = { username: 'FakeBot' };
        });
        await service.onModuleInit();
      });

      it('should register the webhook through the single-instance registration', () => {
        expect(registerUntilReady).toHaveBeenCalledWith(bot, {
          path: `/telegram/webhook/${fakeSecretPath}`,
          secretToken: fakeSecretToken,
          url: `https://api.example.test/telegram/webhook/${fakeSecretPath}`,
        });
      });

      it('should never call setWebhook directly', () => {
        expect(callApi).not.toHaveBeenCalledWith('setWebhook', expect.anything(), expect.anything());
      });

      it('should reuse the bot info from the registration for the username', async () => {
        expect(await service.getBotUsername()).toBe('FakeBot');
      });
    });

    describe('When Telegram never answers', () => {
      it('should not block the module start-up', async () => {
        registerUntilReady.mockReturnValue(new Promise(() => undefined));

        await expect(service.onModuleInit()).resolves.toBeUndefined();
      });
    });
  });

  describe('The sendMessage() method', () => {
    const fakeChatId = 'chat-123';
    const fakeMessage = 'Hello from SentryGuard';

    const buildServiceWithSharedClient = (callApi: jest.Mock): TelegramBotService => {
      const service = new TelegramBotService(webhookRegistration);
      (service as unknown as { bot: { telegram: { callApi: jest.Mock } } }).bot = { telegram: { callApi } };
      return service;
    };

    it('should pass the abort signal to Telegraf callApi', async () => {
      const callApi = jest.fn().mockResolvedValue({});
      const service = buildServiceWithSharedClient(callApi);
      const signal = AbortSignal.abort();

      const result = await service.sendMessage(fakeChatId, fakeMessage, undefined, signal);

      expect(callApi).toHaveBeenCalledWith(
        'sendMessage',
        expect.objectContaining({ chat_id: fakeChatId, text: fakeMessage, parse_mode: 'HTML' }),
        { signal }
      );
      expect(result).toBe(true);
    });

    it('should return false without calling Telegraf when the bot is not initialized', async () => {
      const service = new TelegramBotService(webhookRegistration);

      const result = await service.sendMessage(fakeChatId, fakeMessage);

      expect(result).toBe(false);
    });

    describe('When a fresh connection is requested', () => {
      let sharedCallApi: jest.Mock;
      let signal: AbortSignal;
      let destroySpy: jest.SpyInstance;

      beforeEach(async () => {
        destroySpy = jest.spyOn(https.Agent.prototype, 'destroy');
        sharedCallApi = jest.fn();
        freshCallApi.mockResolvedValue({});
        signal = new AbortController().signal;

        await buildServiceWithSharedClient(sharedCallApi).sendMessage(fakeChatId, fakeMessage, undefined, signal, true);
      });

      it('should not use the shared client', () => {
        expect(sharedCallApi).not.toHaveBeenCalled();
      });

      it('should create the one-shot client with the bot token', () => {
        const [token] = jest.mocked(Telegram).mock.calls[0];

        expect(token).toBe('000000:FAKE_TOKEN');
      });

      it('should give the one-shot client its own single-socket IPv4 agent without keep-alive', () => {
        const [, options] = jest.mocked(Telegram).mock.calls[0];
        const agent = options?.agent as unknown as AgentInternals;

        expect({ family: agent.options.family, keepAlive: agent.keepAlive, maxSockets: agent.maxSockets }).toStrictEqual({
          family: 4,
          keepAlive: false,
          maxSockets: 1,
        });
      });

      it('should send the message with the abort signal through the one-shot client', () => {
        expect(freshCallApi).toHaveBeenCalledWith('sendMessage', expect.objectContaining({ chat_id: fakeChatId }), { signal });
      });

      afterEach(() => {
        destroySpy.mockRestore();
      });

      it('should destroy the one-shot agent afterwards', () => {
        const [, options] = jest.mocked(Telegram).mock.calls[0];
        expect(destroySpy.mock.contexts).toContain(options?.agent);
      });
    });

    describe('When the fresh-connection send fails', () => {
      it('should still destroy the one-shot agent and rethrow', async () => {
        const destroySpy = jest.spyOn(https.Agent.prototype, 'destroy');
        freshCallApi.mockRejectedValue(new Error('read ECONNRESET'));

        await expect(
          buildServiceWithSharedClient(jest.fn()).sendMessage(fakeChatId, fakeMessage, undefined, undefined, true)
        ).rejects.toThrow('read ECONNRESET');

        const [, options] = jest.mocked(Telegram).mock.calls[0];
        expect(destroySpy.mock.contexts).toContain(options?.agent);
        destroySpy.mockRestore();
      });
    });
  });
});
