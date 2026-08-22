import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { AlertNotifierPayload, AlertNotifierRegistry } from './alert-notifier.registry';
import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';

describe('The AlertNotifierRegistry class', () => {
  let registry: AlertNotifierRegistry;

  let mockTelegramService: MockProxy<TelegramService>;
  let mockKeyboardBuilder: MockProxy<TelegramKeyboardBuilderService>;

  const buildPayload = (type: AlertEventType): AlertNotifierPayload => ({
    alertEventId: 'alert-1',
    userId: 'user-1',
    vin: 'VIN-1',
    vehicleDisplayName: 'My Tesla',
    type,
    severity: AlertEventSeverity.Warning,
    correlationId: 'corr-1',
  });

  beforeEach(async () => {
    mockTelegramService = mock<TelegramService>();
    mockKeyboardBuilder = mock<TelegramKeyboardBuilderService>();
    mockTelegramService.sendSentryAlert.mockResolvedValue(true);
    mockTelegramService.sendBreakInAlert.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertNotifierRegistry,
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilder },
      ],
    }).compile();

    registry = module.get<AlertNotifierRegistry>(AlertNotifierRegistry);
    jest.clearAllMocks();
  });

  describe('The notify() method', () => {
    describe('When the alert type is Sentry', () => {
      beforeEach(async () => {
        mockKeyboardBuilder.buildSentryAlertKeyboard.mockReturnValue({ inline_keyboard: [] });
        await registry.notify(buildPayload(AlertEventType.Sentry), 'en');
      });

      it('should build the sentry keyboard', () => {
        expect(mockKeyboardBuilder.buildSentryAlertKeyboard).toHaveBeenCalledWith('user-1', 'en');
      });

      it('should send a sentry alert through the telegram service', () => {
        expect(mockTelegramService.sendSentryAlert).toHaveBeenCalledWith(
          'user-1',
          { vin: 'VIN-1', display_name: 'My Tesla' },
          'en',
          { inline_keyboard: [] },
          false
        );
      });
    });

    describe('When the alert type is BreakIn', () => {
      beforeEach(async () => {
        mockKeyboardBuilder.buildBreakInAlertKeyboard.mockReturnValue({ inline_keyboard: [] });
        await registry.notify(buildPayload(AlertEventType.BreakIn), 'fr');
      });

      it('should build the break-in keyboard', () => {
        expect(mockKeyboardBuilder.buildBreakInAlertKeyboard).toHaveBeenCalledWith('user-1', 'fr');
      });

      it('should send a break-in alert through the telegram service', () => {
        expect(mockTelegramService.sendBreakInAlert).toHaveBeenCalledWith(
          'user-1',
          { vin: 'VIN-1', display_name: 'My Tesla' },
          'fr',
          { inline_keyboard: [] },
          false
        );
      });
    });

    describe('When the alert type is not registered', () => {
      it('should throw an error', async () => {
        const payload = buildPayload('unknown_type' as AlertEventType);

        await expect(registry.notify(payload, 'en')).rejects.toThrow(
          'No notifier registered for alert type unknown_type'
        );
      });
    });
  });
});
