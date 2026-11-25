import { TelegramError } from 'telegraf';
import { CaughtError } from './caught-error';
import { OperationTimeoutError } from './operation-timeout.error';

class FakeFetchError extends Error {
  constructor(message: string, public readonly code: string, public readonly type = 'system') {
    super(message);
    this.name = 'FetchError';
  }
}

const buildSystemError = (code: string, message = ''): Error => Object.assign(new Error(message), { code });

describe('The CaughtError class', () => {
  describe('The isTransientNetwork() method', () => {
    describe('When the error carries a transient network code', () => {
      it.each(['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ECONNREFUSED', 'ENETUNREACH'])('should return true for %s', (code) => {
        expect(new CaughtError(new FakeFetchError('request failed, reason: ', code)).isTransientNetwork()).toBe(true);
      });
    });

    describe('When the network code is only on the cause', () => {
      it('should return true', () => {
        const error = Object.assign(new TypeError('fetch failed'), { cause: buildSystemError('ECONNRESET') });

        expect(new CaughtError(error).isTransientNetwork()).toBe(true);
      });
    });

    describe('When the error is an AggregateError with an empty message', () => {
      it('should return true', () => {
        const error = new AggregateError([buildSystemError('ENETUNREACH'), buildSystemError('ETIMEDOUT')], '');

        expect(new CaughtError(error).isTransientNetwork()).toBe(true);
      });
    });

    describe('When the error is a withTimeout timeout', () => {
      it('should return false', () => {
        expect(new CaughtError(new OperationTimeoutError('ETIMEDOUT: request timed out')).isTransientNetwork()).toBe(false);
      });
    });

    describe('When the error only mentions a code in its message', () => {
      it('should return false', () => {
        expect(new CaughtError(new Error('connect ETIMEDOUT')).isTransientNetwork()).toBe(false);
      });
    });

    describe('When the error is a Telegram API error', () => {
      it('should return false', () => {
        expect(new CaughtError(new TelegramError({ error_code: 403, description: 'Forbidden: bot was blocked by the user' })).isTransientNetwork()).toBe(false);
      });
    });
  });

  describe('The codes() method', () => {
    it('should collect codes from the error, its cause and its aggregated errors without duplicates', () => {
      const error = Object.assign(new AggregateError([buildSystemError('ENETUNREACH'), buildSystemError('ETIMEDOUT')], ''), {
        code: 'ETIMEDOUT',
        cause: buildSystemError('EAI_AGAIN'),
      });

      expect(new CaughtError(error).codes()).toStrictEqual(['ETIMEDOUT', 'EAI_AGAIN', 'ENETUNREACH']);
    });
  });

  describe('The describe() method', () => {
    describe('When a Telegram request fails with an empty reason', () => {
      let description: string;

      beforeEach(() => {
        description = new CaughtError(
          new FakeFetchError('request to https://api.telegram.org/bot123456:FAKE_token-value/sendMessage failed, reason: ', 'ETIMEDOUT')
        ).describe();
      });

      it('should include the error code and type', () => {
        expect(description).toContain('code=ETIMEDOUT');
        expect(description).toContain('type=system');
      });

      it('should redact the bot token from the URL', () => {
        expect(description).toContain('bot<redacted>/sendMessage');
        expect(description).not.toContain('FAKE_token-value');
      });
    });

    describe('When the error is an AggregateError', () => {
      it('should describe each aggregated error', () => {
        const description = new CaughtError(
          new AggregateError([buildSystemError('ENETUNREACH', 'connect ENETUNREACH 2001:db8::1:443'), buildSystemError('ETIMEDOUT', 'connect ETIMEDOUT 192.0.2.1:443')], '')
        ).describe();

        expect(description).toContain('AggregateError: <empty message>');
        expect(description).toContain('connect ENETUNREACH 2001:db8::1:443 (code=ENETUNREACH)');
        expect(description).toContain('connect ETIMEDOUT 192.0.2.1:443 (code=ETIMEDOUT)');
      });
    });

    describe('When the error has a cause', () => {
      it('should describe the cause', () => {
        const error = Object.assign(new TypeError('fetch failed'), { cause: buildSystemError('ECONNRESET', 'read ECONNRESET') });

        expect(new CaughtError(error).describe()).toBe('TypeError: fetch failed (cause=[Error: read ECONNRESET (code=ECONNRESET)])');
      });
    });

    describe('When Telegram rejects the request with a 403', () => {
      it('should include the Telegram description', () => {
        const description = new CaughtError(new TelegramError({ error_code: 403, description: 'Forbidden: bot was blocked by the user' })).describe();

        expect(description).toContain('code=403');
        expect(description).toContain('description="Forbidden: bot was blocked by the user"');
      });
    });

    describe('When Telegram rate-limits the request', () => {
      it('should include the retry_after parameter', () => {
        const description = new CaughtError(
          new TelegramError({ error_code: 429, description: 'Too Many Requests: retry after 3', parameters: { retry_after: 3 } })
        ).describe();

        expect(description).toContain('retry_after=3');
      });
    });

    describe('When a setWebhook request fails with its secret token in the payload', () => {
      it('should never expose the secret token', () => {
        const fakeSecretToken = 'fake-webhook-secret-token-0123456789';
        const description = new CaughtError(
          new TelegramError(
            { error_code: 429, description: 'Too Many Requests: retry after 1', parameters: { retry_after: 1 } },
            { method: 'setWebhook', payload: { secret_token: fakeSecretToken, url: 'https://example.test/telegram/webhook/path' } }
          )
        ).describe();

        expect(description).not.toContain(fakeSecretToken);
      });
    });

    describe('When the rejection is not an Error', () => {
      it('should stringify it', () => {
        expect(new CaughtError('403: Forbidden').describe()).toBe('403: Forbidden');
      });
    });
  });

  describe('The retryAfterMs() method', () => {
    describe('When Telegram rate-limits the request with retry_after', () => {
      it('should return the delay in milliseconds', () => {
        const rateLimitError = new TelegramError({ error_code: 429, description: 'Too Many Requests: retry after 3', parameters: { retry_after: 3 } });

        expect(new CaughtError(rateLimitError).retryAfterMs()).toBe(3000);
      });
    });

    describe('When the error carries no retry_after', () => {
      it('should return null', () => {
        expect(new CaughtError(new TelegramError({ error_code: 502, description: 'Bad Gateway' })).retryAfterMs()).toBeNull();
      });
    });

    describe('When the rejection is not an object', () => {
      it('should return null', () => {
        expect(new CaughtError('429').retryAfterMs()).toBeNull();
      });
    });
  });

  describe('The summarizeReason() method', () => {
    it('should return the HTTP status when there is one', () => {
      expect(new CaughtError(Object.assign(new Error('Service Unavailable'), { status: 503 })).summarizeReason()).toBe('503');
    });

    it('should return the Telegram error code', () => {
      expect(new CaughtError(new TelegramError({ error_code: 502, description: 'Bad Gateway' })).summarizeReason()).toBe('502');
    });

    it('should return the first system code', () => {
      expect(new CaughtError(new FakeFetchError('request failed, reason: ', 'ETIMEDOUT')).summarizeReason()).toBe('ETIMEDOUT');
    });

    it('should return timeout for a withTimeout timeout', () => {
      expect(new CaughtError(new OperationTimeoutError('ETIMEDOUT: request timed out')).summarizeReason()).toBe('timeout');
    });

    it('should fall back to the error message', () => {
      expect(new CaughtError(new Error('Push Error')).summarizeReason()).toBe('Push Error');
    });
  });
});
