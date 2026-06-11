import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { AlertsOffensiveResponseService } from './alerts-offensive-response.service';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';

describe('The AlertsOffensiveResponseService class', () => {
  let service: AlertsOffensiveResponseService;

  const mockVehicleRepository = {
    findOne: jest.fn(),
  };
  let mockTeslaVehicleCommandService: MockProxy<TeslaVehicleCommandService>;

  const fakeVehicle: Vehicle = {
    id: 'vehicle-1',
    userId: 'user-1',
    vin: '5YJ3E1EA123456789',
    sentry_mode_monitoring_enabled: true,
    break_in_monitoring_enabled: true,
    break_in_offensive_response: OffensiveResponse.DISABLED,
    display_name: 'Model 3',
    created_at: new Date(),
    updated_at: new Date(),
    user: null,
  };

  beforeEach(async () => {
    mockTeslaVehicleCommandService = mock<TeslaVehicleCommandService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsOffensiveResponseService,
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
        { provide: TeslaVehicleCommandService, useValue: mockTeslaVehicleCommandService },
      ],
    }).compile();

    service = module.get<AlertsOffensiveResponseService>(AlertsOffensiveResponseService);
    jest.clearAllMocks();
  });

  describe('The handleBreakInOffensiveResponse() method', () => {
    describe('When no vehicle is found for any userId', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
      });

      it('should not trigger any command', async () => {
        await service.handleBreakInOffensiveResponse('UNKNOWN_VIN', ['user-1']);

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When break-in offensive response is DISABLED', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          break_in_offensive_response: OffensiveResponse.DISABLED,
        });
      });

      it('should not trigger any command', async () => {
        await service.handleBreakInOffensiveResponse('5YJ3E1EA123456789', ['user-1']);

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });



    describe('When break-in offensive response is HONK', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          break_in_offensive_response: OffensiveResponse.HONK,
        });
        mockTeslaVehicleCommandService.honkHorn.mockResolvedValue({ success: true });
      });

      it('should trigger honk horn only', async () => {
        await service.handleBreakInOffensiveResponse('5YJ3E1EA123456789', ['user-1']);

        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-1');
      });
    });

    describe('When break-in offensive response is FART', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          ...fakeVehicle,
          break_in_offensive_response: OffensiveResponse.FART,
        });
        mockTeslaVehicleCommandService.remoteBoombox.mockResolvedValue({ success: true });
      });

      it('should trigger remote boombox only', async () => {
        await service.handleBreakInOffensiveResponse('5YJ3E1EA123456789', ['user-1']);

        expect(mockTeslaVehicleCommandService.remoteBoombox).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-1', 0);
      });
    });

    describe('When first userId is disabled and second userId is HONK', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-1',
            break_in_offensive_response: OffensiveResponse.DISABLED,
          })
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-2',
            break_in_offensive_response: OffensiveResponse.HONK,
          });
        mockTeslaVehicleCommandService.honkHorn.mockResolvedValue({ success: true });
      });

      it('should trigger honk horn for the second userId', async () => {
        await service.handleBreakInOffensiveResponse('5YJ3E1EA123456789', ['user-1', 'user-2']);

        expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({ where: { vin: '5YJ3E1EA123456789', userId: 'user-1' } });
        expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({ where: { vin: '5YJ3E1EA123456789', userId: 'user-2' } });
        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-2');
      });
    });

    describe('When all userIds have response disabled', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-1',
            break_in_offensive_response: OffensiveResponse.DISABLED,
          })
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-2',
            break_in_offensive_response: OffensiveResponse.DISABLED,
          });
      });

      it('should not trigger any command', async () => {
        await service.handleBreakInOffensiveResponse('5YJ3E1EA123456789', ['user-1', 'user-2']);

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });

    describe('When first userId is eligible but honk fails and second userId is eligible', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-1',
            break_in_offensive_response: OffensiveResponse.HONK,
          })
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-2',
            break_in_offensive_response: OffensiveResponse.HONK,
          });
        mockTeslaVehicleCommandService.honkHorn
          .mockResolvedValueOnce({ success: false, message: 'vehicle_cmds scope missing' })
          .mockResolvedValueOnce({ success: true });
      });

      it('should try second userId when first fails', async () => {
        await service.handleBreakInOffensiveResponse('5YJ3E1EA123456789', ['user-1', 'user-2']);

        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledTimes(2);
        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-1');
        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-2');
      });
    });

    describe('When first userId is eligible but honk throws and second userId is eligible', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-1',
            break_in_offensive_response: OffensiveResponse.HONK,
          })
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-2',
            break_in_offensive_response: OffensiveResponse.HONK,
          });
        mockTeslaVehicleCommandService.honkHorn
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ success: true });
      });

      it('should try second userId when first throws', async () => {
        await service.handleBreakInOffensiveResponse('5YJ3E1EA123456789', ['user-1', 'user-2']);

        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledTimes(2);
        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-1');
        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledWith('5YJ3E1EA123456789', 'user-2');
      });
    });

    describe('When all eligible userIds fail honk', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-1',
            break_in_offensive_response: OffensiveResponse.HONK,
          })
          .mockResolvedValueOnce({
            ...fakeVehicle,
            userId: 'user-2',
            break_in_offensive_response: OffensiveResponse.HONK,
          });
        mockTeslaVehicleCommandService.honkHorn.mockResolvedValue({ success: false, message: 'error' });
      });

      it('should not trigger any successful command', async () => {
        await service.handleBreakInOffensiveResponse('5YJ3E1EA123456789', ['user-1', 'user-2']);

        expect(mockTeslaVehicleCommandService.honkHorn).toHaveBeenCalledTimes(2);
      });
    });

    describe('When empty userIds array', () => {
      it('should not trigger any command', async () => {
        await service.handleBreakInOffensiveResponse('5YJ3E1EA123456789', []);

        expect(mockTeslaVehicleCommandService.honkHorn).not.toHaveBeenCalled();
      });
    });
  });
});