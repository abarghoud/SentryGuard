import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';
import { BreakInAlertHandlerService } from './break-in-alert-handler.service';
import { TelegramService } from '../../telegram/telegram.service';
import { TelegramKeyboardBuilderService } from '../../telegram/telegram-keyboard-builder.service';
import { UserLanguageService } from '../../user/user-language.service';
import { KafkaLogContextService } from '../../../common/services/kafka-log-context.service';
import { Vehicle } from '../../../entities/vehicle.entity';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';

describe('The BreakInAlertHandlerService class', () => {
  let service: BreakInAlertHandlerService;
  
  let mockTelegramService: MockProxy<TelegramService>;
  let mockKeyboardBuilder: MockProxy<TelegramKeyboardBuilderService>;
  let mockUserLanguageService: MockProxy<UserLanguageService>;
  let mockKafkaLogContextService: MockProxy<KafkaLogContextService>;
  let mockVehicleRepository: MockProxy<Repository<Vehicle>>;

  beforeEach(async () => {
    mockTelegramService = mock<TelegramService>();
    mockKeyboardBuilder = mock<TelegramKeyboardBuilderService>();
    mockUserLanguageService = mock<UserLanguageService>();
    mockKafkaLogContextService = mock<KafkaLogContextService>();
    mockVehicleRepository = mock<Repository<Vehicle>>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BreakInAlertHandlerService,
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: TelegramKeyboardBuilderService, useValue: mockKeyboardBuilder },
        { provide: UserLanguageService, useValue: mockUserLanguageService },
        { provide: KafkaLogContextService, useValue: mockKafkaLogContextService },
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
      ],
    }).compile();

    service = module.get<BreakInAlertHandlerService>(BreakInAlertHandlerService);
  });

  describe('The handle() method', () => {
    describe('When message does not contain CenterDisplay data', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(false);
      });

      it('should not query vehicles', async () => {
        await service.handle(message);
        expect(mockVehicleRepository.find).not.toHaveBeenCalled();
      });

      it('should not send an alert', async () => {
        await service.handle(message);
        expect(mockTelegramService.sendBreakInAlert).not.toHaveBeenCalled();
      });
    });

    describe('When displayState is not DisplayStateLock', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(true);
        jest.spyOn(message, 'getCenterDisplayState').mockReturnValue('DisplayStateOn');
      });

      it('should not send an alert', async () => {
        await service.handle(message);
        expect(mockTelegramService.sendBreakInAlert).not.toHaveBeenCalled();
      });
    });

    describe('When displayState is DisplayStateLock and vehicle has break_in_monitoring_enabled', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(true);
        jest.spyOn(message, 'getCenterDisplayState').mockReturnValue('DisplayStateLock');

        mockVehicleRepository.find.mockResolvedValue([
          { userId: 'user-1', display_name: 'Test Vehicle', break_in_monitoring_enabled: true } as Vehicle,
        ]);
        
        mockUserLanguageService.getUserLanguage.mockResolvedValue('en');
        mockKeyboardBuilder.buildBreakInAlertKeyboard.mockReturnValue({ inline_keyboard: [] });
      });

      it('should send the alert to the matched vehicle', async () => {
        await service.handle(message);
        expect(mockTelegramService.sendBreakInAlert).toHaveBeenCalledWith(
          'user-1',
          { vin: '123', display_name: 'Test Vehicle' },
          'en',
          { inline_keyboard: [] }
        );
      });
    });

    describe('When no vehicles match the vin', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(true);
        jest.spyOn(message, 'getCenterDisplayState').mockReturnValue('DisplayStateLock');

        mockVehicleRepository.find.mockResolvedValue([]);
      });

      it('should not send an alert', async () => {
        await service.handle(message);
        expect(mockTelegramService.sendBreakInAlert).not.toHaveBeenCalled();
      });
    });

    describe('When vehicle is found but break_in_monitoring_enabled is false', () => {
      let message: TelemetryMessage;

      beforeEach(() => {
        message = new TelemetryMessage();
        message.vin = '123';
        jest.spyOn(message, 'validateContainsCenterDisplay').mockReturnValue(true);
        jest.spyOn(message, 'getCenterDisplayState').mockReturnValue('DisplayStateLock');

        mockVehicleRepository.find.mockResolvedValue([
          { userId: 'user-1', display_name: 'Test Vehicle', break_in_monitoring_enabled: false } as Vehicle,
        ]);
      });

      it('should not send an alert', async () => {
        await service.handle(message);
        expect(mockTelegramService.sendBreakInAlert).not.toHaveBeenCalled();
      });
    });
  });
});
