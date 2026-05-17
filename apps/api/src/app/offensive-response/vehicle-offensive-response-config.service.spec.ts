import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { VehicleOffensiveResponseConfigService } from './vehicle-offensive-response-config.service';
import { AlertsOffensiveResponseService } from '../offensive-response/alerts-offensive-response.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';

describe('The VehicleOffensiveResponseConfigService class', () => {
  let service: VehicleOffensiveResponseConfigService;
  let mockOffensiveResponseService: MockProxy<AlertsOffensiveResponseService>;
  let mockVehicleRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    mockOffensiveResponseService = mock<AlertsOffensiveResponseService>();
    mockVehicleRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleOffensiveResponseConfigService,
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockVehicleRepository,
        },
        {
          provide: AlertsOffensiveResponseService,
          useValue: mockOffensiveResponseService,
        },
      ],
    }).compile();

    service = module.get<VehicleOffensiveResponseConfigService>(VehicleOffensiveResponseConfigService);
  });

  describe('The updateOffensiveResponse() method', () => {
    describe('When vehicle is found and break_in field is provided', () => {
      const fakeVehicle = {
        userId: 'user-1',
        vin: 'VIN123',
        break_in_offensive_response: OffensiveResponse.DISABLED,
      } as Vehicle;

      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue(fakeVehicle);
        mockVehicleRepository.save.mockImplementation(async (v) => v);

        await service.updateOffensiveResponse('user-1', 'VIN123', {
          break_in_offensive_response: OffensiveResponse.HONK,
        });
      });

      it('should update break_in field', () => {
        expect(fakeVehicle.break_in_offensive_response).toBe(OffensiveResponse.HONK);
      });

      it('should save the vehicle', () => {
        expect(mockVehicleRepository.save).toHaveBeenCalledWith(fakeVehicle);
      });
    });

    describe('When vehicle is not found', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
      });

      it('should return failure without saving', async () => {
        const result = await service.updateOffensiveResponse('user-1', 'VIN123', {
          break_in_offensive_response: OffensiveResponse.HONK,
        });

        expect(result).toStrictEqual({ success: false });
        expect(mockVehicleRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('The testBreakInOffensiveResponse() method', () => {
    describe('When vehicle belongs to user', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({ userId: 'user-1', vin: 'VIN123' } as Vehicle);
        mockOffensiveResponseService.handleBreakInOffensiveResponse.mockResolvedValue(undefined);
      });

      it('should delegate to handleBreakInOffensiveResponse', async () => {
        await service.testBreakInOffensiveResponse('user-1', 'VIN123');

        expect(mockVehicleRepository.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1', vin: 'VIN123' } });
        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).toHaveBeenCalledWith('VIN123', ['user-1']);
      });
    });

    describe('When vehicle does not belong to user', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
      });

      it('should not trigger offensive response', async () => {
        await service.testBreakInOffensiveResponse('user-1', 'VIN123');

        expect(mockOffensiveResponseService.handleBreakInOffensiveResponse).not.toHaveBeenCalled();
      });
    });
  });
});