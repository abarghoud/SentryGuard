import * as https from 'https';
import { Telegraf, Telegram } from 'telegraf';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramWebhookRegistrationBusyError, TelegramWebhookRegistrationService } from './telegram-webhook-registration.service';

const freshCallApi = jest.fn();
const registerOnce = jest.fn();
const webhookRegistration = { registerOnce } as unknown as TelegramWebhookRegistrationService;

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
    registerOnce.mockReset();
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
    let telegram: { callApi: jest.Mock };
    let service: TelegramBotService;

    beforeEach(() => {
      jest.useFakeTimers();
      process.env.TELEGRAM_WEBHOOK_BASE = 'https://api.example.test/';
      process.env.TELEGRAM_WEBHOOK_SECRET_PATH = fakeSecretPath;
      process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN = fakeSecretToken;
      callApi = jest.fn().mockResolvedValue({ username: 'FakeBot' });
      telegram = { callApi };
      jest.mocked(Telegraf).mockImplementationOnce(() => ({ telegram, webhookCallback: jest.fn() }) as never);
      service = new TelegramBotService(webhookRegistration);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('When Telegram answers right away', () => {
      beforeEach(async () => {
        await service.onModuleInit();
        await jest.advanceTimersByTimeAsync(0);
      });

      it('should register the webhook once through the single-instance registration', () => {
        expect(registerOnce).toHaveBeenCalledWith(telegram, {
          path: `/telegram/webhook/${fakeSecretPath}`,
          secretToken: fakeSecretToken,
          url: `https://api.example.test/telegram/webhook/${fakeSecretPath}`,
        });
      });

      it('should never call setWebhook directly', () => {
        expect(callApi).not.toHaveBeenCalledWith('setWebhook', expect.anything(), expect.anything());
      });

      it('should reuse the bot info from getMe for the username', async () => {
        expect(await service.getBotUsername()).toBe('FakeBot');
      });
    });

    describe('When Telegram never answers', () => {
      it('should not block the module start-up', async () => {
        callApi.mockReturnValue(new Promise(() => undefined));

        await expect(service.onModuleInit()).resolves.toBeUndefined();
      });
    });

    describe('When Telegram rate-limits the initialization with retry_after', () => {
      beforeEach(async () => {
        const { TelegramError } = jest.requireActual('telegraf');
        callApi.mockRejectedValueOnce(new TelegramError({ error_code: 429, description: 'Too Many Requests: retry after 1', parameters: { retry_after: 1 } }));
        await service.onModuleInit();
      });

      it('should not retry before retry_after has elapsed', async () => {
        await jest.advanceTimersByTimeAsync(999);

        expect(registerOnce).not.toHaveBeenCalled();
      });

      it('should complete the initialization once retry_after has elapsed', async () => {
        await jest.advanceTimersByTimeAsync(1000);

        expect(registerOnce).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the initialization keeps failing without retry_after', () => {
      beforeEach(async () => {
        registerOnce.mockRejectedValueOnce(new Error('read ECONNRESET')).mockRejectedValueOnce(new Error('read ECONNRESET'));
        await service.onModuleInit();
      });

      it('should back off exponentially between attempts', async () => {
        await jest.advanceTimersByTimeAsync(2999);

        expect(registerOnce).toHaveBeenCalledTimes(2);
      });

      it('should stop retrying once the initialization succeeds', async () => {
        await jest.advanceTimersByTimeAsync(60_000);

        expect(registerOnce).toHaveBeenCalledTimes(3);
      });
    });

    describe('When another instance is registering the webhook', () => {
      beforeEach(async () => {
        registerOnce.mockRejectedValueOnce(new TelegramWebhookRegistrationBusyError());
        await service.onModuleInit();
      });

      it('should register again itself once the other instance is done', async () => {
        await jest.advanceTimersByTimeAsync(1000);

        expect(registerOnce).toHaveBeenCalledTimes(2);
      });
    });

    describe('When the module is destroyed while the initialization is failing', () => {
      it('should stop retrying', async () => {
        registerOnce.mockRejectedValue(new Error('read ECONNRESET'));
        await service.onModuleInit();

        service.onModuleDestroy();
        await jest.advanceTimersByTimeAsync(60_000);

        expect(registerOnce).toHaveBeenCalledTimes(1);
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
