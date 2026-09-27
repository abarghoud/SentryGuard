import { Test } from '@nestjs/testing';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { TelegramError } from 'telegraf';
import { ALERT_JUDGMENT_REQUEST_OPTIONS } from '../../config/typesafe-judgment.config';
import { typeSafeClientProvider } from '../utils/typesafe-client.token';
import { ErrorMeaningClassifierService } from './error-meaning-classifier.service';

describe('The ErrorMeaningClassifierService class', () => {
  const fakeUsage = { input_tokens: 120, output_tokens: 4 };
  const unknownTelegramWording = 'Forbidden: the conversation was closed by its owner';
  let systemOne: jest.Mock;
  let service: ErrorMeaningClassifierService;

  function judgment(choice: string, confidence: number) {
    return {
      model: 'jev-latest',
      answers: { kind: { choice, confidence } },
      usage: fakeUsage,
    };
  }

  beforeEach(() => {
    systemOne = jest.fn();
    const stubClient = { systemOne } as unknown as TypeSafeClient;
    service = new ErrorMeaningClassifierService(stubClient);
  });

  describe('When resolved through the Nest container', () => {
    it('should build without an explicitly provided client', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [ErrorMeaningClassifierService, typeSafeClientProvider],
      }).compile();

      expect(moduleRef.get(ErrorMeaningClassifierService)).toBeInstanceOf(ErrorMeaningClassifierService);
    });
  });

  describe('The isTelegramContactGone() method', () => {
    describe('When the legacy matcher recognises the wording', () => {
      it.each(['bot was blocked by the user', 'Forbidden: user is deactivated', 'chat not found'])(
        'should report %s as gone without calling TypeSafe', async (message) => {
          await expect(service.isTelegramContactGone(new Error(message))).resolves.toBe(true);
          expect(systemOne).not.toHaveBeenCalled();
        }
      );
    });

    describe('When the wording is unknown and TypeSafe is confident', () => {
      it('should report the contact as gone', async () => {
        systemOne.mockResolvedValue(judgment('user_blocked_bot', 0.95));

        await expect(service.isTelegramContactGone(new Error(unknownTelegramWording))).resolves.toBe(true);
      });
    });

    describe('When the wording is unknown and TypeSafe confidence is below the threshold', () => {
      it('should not report the contact as gone', async () => {
        systemOne.mockResolvedValue(judgment('user_blocked_bot', 0.3));

        await expect(service.isTelegramContactGone(new Error(unknownTelegramWording))).resolves.toBe(false);
      });
    });

    describe('When no TypeSafe client is configured', () => {
      it('should still recognise legacy wording', async () => {
        const offlineService = new ErrorMeaningClassifierService(null);

        await expect(offlineService.isTelegramContactGone(new Error('chat not found'))).resolves.toBe(true);
      });
    });

    describe('When the error is unrelated to the chat', () => {
      it('should return false', async () => {
        systemOne.mockResolvedValue(judgment('unrelated', 0.9));

        await expect(service.isTelegramContactGone(new Error(unknownTelegramWording))).resolves.toBe(false);
      });
    });
  });

  describe('The isRetryableTelegramSend() method', () => {
    describe('When the error is a TelegramError with a retryable status code', () => {
      it('should return true without calling TypeSafe', async () => {
        const error = new TelegramError({ error_code: 429, description: 'Too Many Requests' });

        await expect(service.isRetryableTelegramSend(error)).resolves.toBe(true);
        expect(systemOne).not.toHaveBeenCalled();
      });
    });

    describe('When the wording is unknown and TypeSafe reports a transient failure', () => {
      it('should return true', async () => {
        systemOne.mockResolvedValue(judgment('transient_retryable', 0.9));

        await expect(service.isRetryableTelegramSend(new Error('socket hang up'))).resolves.toBe(true);
      });
    });

    describe('When the bot was blocked', () => {
      it('should return false', async () => {
        await expect(service.isRetryableTelegramSend(new Error('bot was blocked by the user'))).resolves.toBe(false);
      });
    });

    describe('When the TypeSafe request fails', () => {
      it('should fall back to the legacy matcher', async () => {
        systemOne.mockRejectedValue(new Error('connection reset'));

        await expect(service.isRetryableTelegramSend(new Error('network timeout'))).resolves.toBe(false);
      });
    });
  });

  describe('When the same error reaches both Telegram predicates', () => {
    it('should ask TypeSafe only once', async () => {
      systemOne.mockResolvedValue(judgment('transient_retryable', 0.9));
      const error = new Error(unknownTelegramWording);

      await service.isTelegramContactGone(error);
      await service.isRetryableTelegramSend(error);

      expect(systemOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('When TypeSafe is consulted on the alert path', () => {
    it('should cap the request so a slow judgment cannot hold a notification worker', async () => {
      systemOne.mockResolvedValue(judgment('user_blocked_bot', 0.95));

      await service.isTelegramContactGone(new Error(unknownTelegramWording));

      expect(systemOne.mock.calls[0][1]).toStrictEqual(ALERT_JUDGMENT_REQUEST_OPTIONS);
    });
  });

  describe('The isTeslaTokenRevoked() method', () => {
    describe('When the error carries a timeout error code', () => {
      it('should return false without calling TypeSafe', async () => {
        const error = { code: 'ETIMEDOUT', message: 'connect ETIMEDOUT' };

        await expect(service.isTeslaTokenRevoked(error)).resolves.toBe(false);
        expect(systemOne).not.toHaveBeenCalled();
      });
    });

    describe('When the error carries a gateway timeout status', () => {
      it('should return false without calling TypeSafe', async () => {
        const error = { message: 'timeout', response: { status: 504 } };

        await expect(service.isTeslaTokenRevoked(error)).resolves.toBe(false);
        expect(systemOne).not.toHaveBeenCalled();
      });
    });

    describe('When TypeSafe confidently identifies a revoked token', () => {
      it('should return true', async () => {
        systemOne.mockResolvedValue(judgment('token_revoked', 0.93));
        const error = { message: 'Unauthorized', response: { status: 401 } };

        await expect(service.isTeslaTokenRevoked(error)).resolves.toBe(true);
      });
    });

    describe('When the revocation wording lives in the response body', () => {
      it('should forward the body text to TypeSafe', async () => {
        systemOne.mockResolvedValue(judgment('token_revoked', 0.93));
        const error = {
          message: 'Request failed with status code 401',
          response: { status: 401, data: { error: 'access revoked by the user' } },
        };

        await service.isTeslaTokenRevoked(error);

        expect(systemOne.mock.calls[0][0].state).toMatchObject({ details: 'access revoked by the user' });
      });
    });

    describe('When TypeSafe confidence is below the threshold', () => {
      it('should return false', async () => {
        systemOne.mockResolvedValue(judgment('token_revoked', 0.4));
        const error = { message: 'Unauthorized', response: { status: 401 } };

        await expect(service.isTeslaTokenRevoked(error)).resolves.toBe(false);
      });
    });

    describe('When no TypeSafe client is configured', () => {
      it('should return false', async () => {
        const offlineService = new ErrorMeaningClassifierService(null);
        const error = { message: 'Unauthorized', response: { status: 401 } };

        await expect(offlineService.isTeslaTokenRevoked(error)).resolves.toBe(false);
      });
    });
  });
});
