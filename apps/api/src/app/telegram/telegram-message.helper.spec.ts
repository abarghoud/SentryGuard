import { TelegramMessageHelper } from './telegram-message.helper';
import { TelegramMessageOptions } from './telegram.types';

describe('The TelegramMessageHelper class', () => {
  describe('The formatRemainingTime() method', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('When the remaining time is less than one hour', () => {
      it('should return minutes only', () => {
        const date = new Date(now.getTime() + 30 * 60_000);

        expect(TelegramMessageHelper.formatRemainingTime(date)).toBe('30min');
      });

      it('should return at least 1min when time is nearly elapsed', () => {
        const date = new Date(now.getTime() + 10_000);

        expect(TelegramMessageHelper.formatRemainingTime(date)).toBe('1min');
      });
    });

    describe('When the remaining time is exactly one hour', () => {
      it('should return hours only without minutes', () => {
        const date = new Date(now.getTime() + 60 * 60_000);

        expect(TelegramMessageHelper.formatRemainingTime(date)).toBe('1h');
      });
    });

    describe('When the remaining time is more than one hour with remaining minutes', () => {
      it('should return hours and minutes', () => {
        const date = new Date(now.getTime() + 90 * 60_000);

        expect(TelegramMessageHelper.formatRemainingTime(date)).toBe('1h 30min');
      });
    });

    describe('When the remaining time is multiple hours without remaining minutes', () => {
      it('should return hours only', () => {
        const date = new Date(now.getTime() + 4 * 60 * 60_000);

        expect(TelegramMessageHelper.formatRemainingTime(date)).toBe('4h');
      });
    });
  });

  describe('The buildOptions() method', () => {
    describe('When called without options', () => {
      it('should default to HTML parse_mode', () => {
        const result = TelegramMessageHelper.buildOptions();

        expect(result).toStrictEqual({ parse_mode: 'HTML' });
      });
    });

    describe('When a parse_mode is provided', () => {
      it('should use the provided parse_mode', () => {
        const options: TelegramMessageOptions = { parse_mode: 'Markdown' };

        const result = TelegramMessageHelper.buildOptions(options);

        expect(result).toStrictEqual({ parse_mode: 'Markdown' });
      });
    });

    describe('When an inline_keyboard is provided', () => {
      it('should include reply_markup with inline_keyboard', () => {
        const options: TelegramMessageOptions = {
          keyboard: {
            inline_keyboard: [[{ text: 'Click me', callback_data: 'action' }]],
          },
        };

        const result = TelegramMessageHelper.buildOptions(options);

        expect(result).toStrictEqual({
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: 'Click me', callback_data: 'action' }]],
          },
        });
      });
    });

    describe('When a reply keyboard is provided', () => {
      it('should include reply_markup with keyboard and its properties', () => {
        const options: TelegramMessageOptions = {
          keyboard: {
            keyboard: [[{ text: 'Option 1' }], [{ text: 'Option 2' }]],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        };

        const result = TelegramMessageHelper.buildOptions(options);

        expect(result).toStrictEqual({
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [[{ text: 'Option 1' }], [{ text: 'Option 2' }]],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        });
      });
    });

    describe('When both inline_keyboard and keyboard are provided', () => {
      it('should prioritize inline_keyboard', () => {
        const options: TelegramMessageOptions = {
          keyboard: {
            inline_keyboard: [[{ text: 'Inline', callback_data: 'cb' }]],
            keyboard: [[{ text: 'Reply' }]],
          },
        };

        const result = TelegramMessageHelper.buildOptions(options);

        expect(result).toStrictEqual({
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: 'Inline', callback_data: 'cb' }]],
          },
        });
      });
    });
  });
});
