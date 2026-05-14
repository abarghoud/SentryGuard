import { Test, TestingModule } from '@nestjs/testing';
import { TelegramKeyboardBuilderService } from './telegram-keyboard-builder.service';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';

type TelegramKeyboard = {
  inline_keyboard: Array<Array<{ text: string; url: string }>>;
};

describe('The TelegramKeyboardBuilderService class', () => {
  let service: TelegramKeyboardBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramKeyboardBuilderService],
    }).compile();

    service = module.get<TelegramKeyboardBuilderService>(TelegramKeyboardBuilderService);
  });

  describe('The buildSentryAlertKeyboard() method', () => {
    const userId = 'user-123';
    const baseUrl = 'http://localhost:3000';

    beforeEach(() => {
      process.env.TELEGRAM_WEBHOOK_BASE = baseUrl;
    });

    afterEach(() => {
      delete process.env.TELEGRAM_WEBHOOK_BASE;
    });

    describe('When called with valid parameters', () => {
      let result: TelegramKeyboard;

      beforeEach(() => {
        result = service.buildSentryAlertKeyboard(userId, 'en');
      });

      it('should return keyboard with inline_keyboard structure', () => {
        expect(result).toHaveProperty('inline_keyboard');
        expect(Array.isArray(result.inline_keyboard)).toBe(true);
        expect(result.inline_keyboard).toHaveLength(1);
      });

      it('should contain one button row', () => {
        expect(result.inline_keyboard[0]).toHaveLength(1);
      });

      it('should have button with correct text and URL', () => {
        const button = result.inline_keyboard[0][0];
        expect(button).toHaveProperty('text');
        expect(button).toHaveProperty('url');
        expect(button.text).toContain('Check');
        expect(button.url).toContain(`${baseUrl}/redirect/tesla-app`);
      });

      it('should include userId and lang in URL', () => {
        const button = result.inline_keyboard[0][0];
        expect(button.url).toContain('userId=user-123');
        expect(button.url).toContain('lang=en');
      });
    });

    describe('When called with French language', () => {
      let result: TelegramKeyboard;

      beforeEach(() => {
        result = service.buildSentryAlertKeyboard(userId, 'fr');
      });

      it('should use French button text', () => {
        const button = result.inline_keyboard[0][0];
        expect(button.text).toContain('Vérifier');
        expect(button.url).toContain('lang=fr');
      });
    });

    describe('When TELEGRAM_WEBHOOK_BASE is not set', () => {
      let result: TelegramKeyboard;

      beforeEach(() => {
        delete process.env.TELEGRAM_WEBHOOK_BASE;
        result = service.buildSentryAlertKeyboard(userId, 'en');
      });

      it('should use localhost fallback', () => {
        const button = result.inline_keyboard[0][0];
        expect(button.url).toContain('http://localhost:3000/redirect/tesla-app');
      });
    });
  });

  describe('The buildMainMenuKeyboard() method', () => {
    it('should have two rows with sentry and break-in buttons', () => {
      const result = service.buildMainMenuKeyboard('en');

      expect(result.keyboard).toBeDefined();
      const keyboard = result.keyboard?.keyboard as Array<Array<{ text: string }>>;
      expect(keyboard).toHaveLength(2);
      expect(keyboard[0]).toHaveLength(2);
      expect(keyboard[1]).toHaveLength(2);
    });
  });

  describe('The buildOffensiveTypeKeyboard() method', () => {
    it('should return sentry options with checkmark on current value', () => {
      const result = service.buildOffensiveTypeKeyboard('vehicle-1', 'sentry', OffensiveResponse.DISABLED, 'en');

      expect(result.keyboard).toBeDefined();
      const inlineKeyboard = result.keyboard?.inline_keyboard;

      expect(inlineKeyboard).toHaveLength(3);
      expect(inlineKeyboard?.[0]?.[0]?.callback_data).toBe(`o_ss:vehicle-1:${OffensiveResponse.DISABLED}`);
      expect(inlineKeyboard?.[0]?.[0]?.text).toContain('✅');
      expect(inlineKeyboard?.[1]?.[0]?.callback_data).toBe(`o_ss:vehicle-1:${OffensiveResponse.HONK}`);
      expect(inlineKeyboard?.[2]?.[0]?.callback_data).toBe('o_ts:vehicle-1');
    });

    it('should return break-in options with checkmark on current value', () => {
      const result = service.buildOffensiveTypeKeyboard('vehicle-1', 'break_in', OffensiveResponse.HONK, 'en');

      expect(result.keyboard).toBeDefined();
      const inlineKeyboard = result.keyboard?.inline_keyboard;

      expect(inlineKeyboard).toHaveLength(3);
      expect(inlineKeyboard?.[0]?.[0]?.callback_data).toBe(`o_sb:vehicle-1:${OffensiveResponse.DISABLED}`);
      expect(inlineKeyboard?.[1]?.[0]?.callback_data).toBe(`o_sb:vehicle-1:${OffensiveResponse.HONK}`);
      expect(inlineKeyboard?.[1]?.[0]?.text).toContain('✅');
      expect(inlineKeyboard?.[2]?.[0]?.callback_data).toBe('o_tb:vehicle-1');
    });
  });
});