import { Logger } from '@nestjs/common';
import {
  SupporterTextJudge,
  isPrivateSupporter,
  judgeSupporterTextWithTypeSafe,
  sanitizeMessage,
  sanitizeName,
} from './supporter-sanitizer.util';

describe('The supporter-sanitizer utility', () => {
  const allowAll: SupporterTextJudge = async () => false;
  const blockAll: SupporterTextJudge = async () => true;
  const failJudge: SupporterTextJudge = async () => {
    throw new Error('TypeSafe unavailable');
  };

  describe('Supporter text moderation, through sanitizeMessage() and sanitizeName()', () => {
    describe('When text is empty', () => {
      it('should not consult the judge', async () => {
        const judge = jest.fn().mockResolvedValue(false);

        await sanitizeMessage('', false, judge);

        expect(judge).not.toHaveBeenCalled();
      });
    });

    describe('When text contains web links or domain names', () => {
      it.each(['https://scam.com', 'visit my site www.crypto.io', 'join t.me/free_crypto'])(
        'should drop %s without calling the judge', async (text) => {
          const judge = jest.fn().mockResolvedValue(false);

          await expect(sanitizeMessage(text, false, judge)).resolves.toBeUndefined();
          expect(judge).not.toHaveBeenCalled();
        }
      );
    });

    describe('When the judge blocks the text', () => {
      it('should drop the message', async () => {
        await expect(sanitizeMessage('some insult', false, blockAll)).resolves.toBeUndefined();
      });
    });

    describe('When the judge allows the text', () => {
      it.each(['Alexandre', 'Merci pour votre super travail !'])(
        'should preserve %s', async (text) => {
          await expect(sanitizeMessage(text, false, allowAll)).resolves.toBe(text);
        }
      );
    });

    describe('When the judge fails on profane text', () => {
      it.each(['gros connard', 'FUCK THIS'])(
        'should drop %s through the legacy fallback', async (text) => {
          await expect(sanitizeMessage(text, false, failJudge)).resolves.toBeUndefined();
        }
      );
    });

    describe('When the judge fails on clean text', () => {
      it('should preserve the message', async () => {
        await expect(sanitizeMessage('Alexandre', false, failJudge)).resolves.toBe('Alexandre');
      });
    });

    describe('When text matches a known profanity as a whole word', () => {
      it.each(['Conn@rd', 'C0nnard', 'c0nn@rd', 'b1tch', 'Hitler', 'CONNARD', 'Adolf Hitler', 'nazi'])(
        'should anonymise %s without calling the judge', async (text) => {
          const judge = jest.fn().mockResolvedValue(false);

          await expect(sanitizeName(text, false, judge)).resolves.toBe('Anonyme');
          expect(judge).not.toHaveBeenCalled();
        }
      );
    });

    describe('When text is a morphological variant of a known profanity', () => {
      it('should anonymise Fuck3r through the legacy fallback', async () => {
        await expect(sanitizeName('Fuck3r', false, failJudge)).resolves.toBe('Anonyme');
      });

      it('should defer connards to the judge', async () => {
        const judge = jest.fn().mockResolvedValue(false);

        await expect(sanitizeMessage('connards', false, judge)).resolves.toBe('connards');
        expect(judge).toHaveBeenCalledWith('connards');
      });
    });

    describe('When profanity is embedded in a longer name', () => {
      it.each(['Dickens', 'D1ckens family fund', 'Dickson'])(
        'should preserve %s', async (name) => {
          await expect(sanitizeName(name, false, failJudge)).resolves.toBe(name);
        }
      );

      it.each(['you dick', 'dick!'])(
        'should still drop %s', async (text) => {
          await expect(sanitizeMessage(text, false, failJudge)).resolves.toBeUndefined();
        }
      );
    });
  });

  describe('The moderation thresholds, through judgeSupporterTextWithTypeSafe()', () => {
    const originalApiKey = process.env.TYPESAFE_API_KEY;
    const originalFetch = global.fetch;
    const cleanText = 'Merci pour le projet';
    const legacyProfaneText = 'connards';

    function stubProbabilities(profanity: number, spam: number, politics: number): void {
      global.fetch = jest.fn().mockImplementation(async () =>
        new Response(
          JSON.stringify({
            model: 'jev-latest',
            answers: {
              profanity: { type: 'noul', noul: profanity },
              spam: { type: 'noul', noul: spam },
              politics: { type: 'noul', noul: politics },
            },
            usage: { input_tokens: 100, output_tokens: 0 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      ) as unknown as typeof fetch;
    }

    beforeEach(() => {
      process.env.TYPESAFE_API_KEY = 'test-key';
    });

    afterEach(() => {
      process.env.TYPESAFE_API_KEY = originalApiKey;
      global.fetch = originalFetch;
    });

    describe('When a probability reaches the block threshold', () => {
      it.each([
        { profanity: 0.97, spam: 0.09, politics: 0 },
        { profanity: 0.1, spam: 0.79, politics: 0 },
        { profanity: 0.1, spam: 0.05, politics: 0.85 },
        { profanity: 0.7, spam: 0, politics: 0 },
      ])(
        'should block clean text for $profanity profanity, $spam spam and $politics politics',
        async ({ profanity, spam, politics }) => {
          stubProbabilities(profanity, spam, politics);

          await expect(judgeSupporterTextWithTypeSafe(cleanText)).resolves.toBe(true);
        }
      );
    });

    describe('When a probability is uncertain', () => {
      it.each([
        { profanity: 0.42, spam: 0.17, politics: 0 },
        { profanity: 0.57, spam: 0.18, politics: 0 },
        { profanity: 0.1, spam: 0.36, politics: 0 },
        { profanity: 0.1, spam: 0.05, politics: 0.5 },
        { profanity: 0.35, spam: 0, politics: 0 },
      ])(
        'should defer to the legacy blocklist for $profanity profanity, $spam spam and $politics politics',
        async ({ profanity, spam, politics }) => {
          stubProbabilities(profanity, spam, politics);

          await expect(judgeSupporterTextWithTypeSafe(legacyProfaneText)).resolves.toBe(true);
          await expect(judgeSupporterTextWithTypeSafe(cleanText)).resolves.toBe(false);
        }
      );
    });

    describe('When every probability is low', () => {
      it.each([
        { profanity: 0.02, spam: 0.04 },
        { profanity: 0.1, spam: 0.29 },
        { profanity: 0.34, spam: 0 },
      ])(
        'should allow text the legacy blocklist would reject, for $profanity profanity and $spam spam',
        async ({ profanity, spam }) => {
          stubProbabilities(profanity, spam, 0);

          await expect(judgeSupporterTextWithTypeSafe(legacyProfaneText)).resolves.toBe(false);
        }
      );
    });
  });

  describe('The default judge, through sanitizeMessage()', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    describe('When the text matches the legacy blocklist', () => {
      it('should drop it without reaching the network', async () => {
        global.fetch = jest.fn() as unknown as typeof fetch;

        await expect(sanitizeMessage('c0nn4rds')).resolves.toBeUndefined();
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    describe('When the text is clean', () => {
      it('should preserve it without reaching the network', async () => {
        global.fetch = jest.fn() as unknown as typeof fetch;

        await expect(sanitizeMessage('Merci pour le projet')).resolves.toBe('Merci pour le projet');
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('The judgeSupporterTextWithTypeSafe() function', () => {
    const originalApiKey = process.env.TYPESAFE_API_KEY;
    const originalFetch = global.fetch;

    afterEach(() => {
      process.env.TYPESAFE_API_KEY = originalApiKey;
      global.fetch = originalFetch;
    });

    describe('When TypeSafe is uncertain and legacy recognizes profanity', () => {
      it('should block through the legacy fallback', async () => {
        process.env.TYPESAFE_API_KEY = 'test-key';
        global.fetch = jest.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              model: 'jev-latest',
              answers: {
                profanity: { type: 'noul', noul: 0.42 },
                spam: { type: 'noul', noul: 0.17 },
                politics: { type: 'noul', noul: 0.05 },
              },
              usage: { input_tokens: 100, output_tokens: 0 },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
        ) as unknown as typeof fetch;

        await expect(judgeSupporterTextWithTypeSafe('c0nn4rds')).resolves.toBe(true);
      });
    });

    describe('When TypeSafe is uncertain and legacy finds nothing', () => {
      it('should allow', async () => {
        process.env.TYPESAFE_API_KEY = 'test-key';
        global.fetch = jest.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              model: 'jev-latest',
              answers: {
                profanity: { type: 'noul', noul: 0.57 },
                spam: { type: 'noul', noul: 0.18 },
                politics: { type: 'noul', noul: 0.04 },
              },
              usage: { input_tokens: 100, output_tokens: 0 },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
        ) as unknown as typeof fetch;

        await expect(judgeSupporterTextWithTypeSafe('D1ckens family fund')).resolves.toBe(false);
      });
    });

    describe('When TypeSafe is confident about politics', () => {
      it('should block', async () => {
        process.env.TYPESAFE_API_KEY = 'test-key';
        global.fetch = jest.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              model: 'jev-latest',
              answers: {
                profanity: { type: 'noul', noul: 0.05 },
                spam: { type: 'noul', noul: 0.1 },
                politics: { type: 'noul', noul: 0.92 },
              },
              usage: { input_tokens: 100, output_tokens: 0 },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
        ) as unknown as typeof fetch;

        await expect(judgeSupporterTextWithTypeSafe('Trump 2028!')).resolves.toBe(true);
      });
    });
  });

  describe('The supporter moderation judgment log', () => {
    const originalApiKey = process.env.TYPESAFE_API_KEY;
    const originalFetch = global.fetch;
    const secretText = 'Jean-Patrick de la Tourniquette';
    let loggedLines: string[];

    beforeEach(async () => {
      loggedLines = [];
      jest.spyOn(Logger.prototype, 'log').mockImplementation((line) => {
        loggedLines.push(String(line));
      });
      process.env.TYPESAFE_API_KEY = 'test-key';
      global.fetch = jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            model: 'jev-latest',
            answers: {
              profanity: { type: 'noul', noul: 0.01 },
              spam: { type: 'noul', noul: 0.02 },
              politics: { type: 'noul', noul: 0.03 },
            },
            usage: { input_tokens: 100, output_tokens: 3 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      ) as unknown as typeof fetch;

      await judgeSupporterTextWithTypeSafe(secretText);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      process.env.TYPESAFE_API_KEY = originalApiKey;
      global.fetch = originalFetch;
    });

    it('should record the judgment', () => {
      expect(loggedLines.join('\n')).toContain('[TYPESAFE_JUDGMENT]');
    });

    it('should never contain the supporter text', () => {
      expect(loggedLines.join('\n')).not.toContain(secretText);
    });
  });

  describe('The sanitizeName() function', () => {
    describe('When supporter is marked as private', () => {
      it('should return Anonyme', async () => {
        await expect(sanitizeName('John Doe', true, failJudge)).resolves.toBe('Anonyme');
      });
    });

    describe('When supporter name is generic, empty, or an email', () => {
      it('should return Anonyme', async () => {
        await expect(sanitizeName('   ', false, allowAll)).resolves.toBe('Anonyme');
        await expect(sanitizeName('""', false, allowAll)).resolves.toBe('Anonyme');
        await expect(sanitizeName("''", false, allowAll)).resolves.toBe('Anonyme');
        await expect(sanitizeName('Someone', false, allowAll)).resolves.toBe('Anonyme');
        await expect(sanitizeName('Anonymous', false, allowAll)).resolves.toBe('Anonyme');
        await expect(sanitizeName('john.doe@example.com', false, allowAll)).resolves.toBe('Anonyme');
      });
    });

    describe('When a name contains an email address', () => {
      it.each(['alice@example.com', 'alice+tesla@example.fr', 'Alice <alice@example.photography>'])(
        'should hide %s without calling the judge', async (name) => {
          const judge = jest.fn().mockResolvedValue(false);

          await expect(sanitizeName(name, false, judge)).resolves.toBe('Anonyme');
          expect(judge).not.toHaveBeenCalled();
        }
      );
    });

    describe('When a name is an X username', () => {
      it.each(['@alice', '@alice_123', 'alice_123', '  @alice_123  '])(
        'should preserve %s after moderation', async (name) => {
          const judge = jest.fn().mockResolvedValue(false);

          await expect(sanitizeName(name, false, judge)).resolves.toBe(name.trim());
          expect(judge).toHaveBeenCalledWith(name.trim());
        }
      );

      it('should still hide a username blocked by moderation', async () => {
        await expect(sanitizeName('@offensive', false, blockAll)).resolves.toBe('Anonyme');
      });

      it('should not submit a private username for moderation', async () => {
        const judge = jest.fn().mockResolvedValue(false);

        await expect(sanitizeName('@alice', true, judge)).resolves.toBe('Anonyme');
        expect(judge).not.toHaveBeenCalled();
      });
    });

    describe('When the judge blocks the name', () => {
      it('should return Anonyme', async () => {
        await expect(sanitizeName('Hitler', false, blockAll)).resolves.toBe('Anonyme');
        await expect(sanitizeName('https://spam.com', false, allowAll)).resolves.toBe('Anonyme');
      });
    });

    describe('When supporter name is clean', () => {
      it('should return the trimmed name', async () => {
        await expect(sanitizeName('  John Doe  ', false, allowAll)).resolves.toBe('John Doe');
      });
    });

    describe('When supporter name is excessively long', () => {
      it('should truncate to 30 characters', async () => {
        const longName = 'ThisIsAVeryLongSupporterNameThatExceedsTheLimit';
        const result = await sanitizeName(longName, false, allowAll);
        expect(result.length).toBeLessThanOrEqual(30);
        expect(result.endsWith('...')).toBe(true);
      });
    });
  });

  describe('The sanitizeMessage() function', () => {
    describe('When message is private or blocked', () => {
      it('should return undefined', async () => {
        await expect(sanitizeMessage('Nice app', true, allowAll)).resolves.toBeUndefined();
        await expect(sanitizeMessage('Visit https://gambling.com', false, allowAll)).resolves.toBeUndefined();
        await expect(sanitizeMessage('salope', false, blockAll)).resolves.toBeUndefined();
      });
    });

    describe('When message is clean', () => {
      it('should return the trimmed message', async () => {
        await expect(sanitizeMessage('  Bravo pour cette app !  ', false, allowAll)).resolves.toBe('Bravo pour cette app !');
      });
    });

    describe('When message is excessively long', () => {
      it('should truncate to 120 characters', async () => {
        const longMsg = 'a'.repeat(200);
        const result = await sanitizeMessage(longMsg, false, allowAll);
        expect(result?.length).toBeLessThanOrEqual(120);
        expect(result?.endsWith('...')).toBe(true);
      });
    });
  });

  describe('The isPrivateSupporter() function', () => {
    describe('When data has private flags set to true', () => {
      it('should return true', () => {
        expect(isPrivateSupporter({ is_private: true })).toBe(true);
        expect(isPrivateSupporter({ payer_is_private: 'true' })).toBe(true);
        expect(isPrivateSupporter({ is_anonymous: '1' })).toBe(true);
      });
    });

    describe('When data has no private flags', () => {
      it('should return false', () => {
        expect(isPrivateSupporter({})).toBe(false);
        expect(isPrivateSupporter({ is_private: false })).toBe(false);
      });
    });
  });
});
