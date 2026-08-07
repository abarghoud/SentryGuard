import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { OffensiveResponseController } from './offensive-response.controller';
import { VehicleOffensiveResponseConfigService } from './vehicle-offensive-response-config.service';
import { ConsentGuard } from '../../common/guards/consent.guard';
import { User } from '../../entities/user.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';

describe('The OffensiveResponseController class', () => {
  let controller: OffensiveResponseController;
  let mockService: MockProxy<VehicleOffensiveResponseConfigService>;

  const mockUser = { userId: 'test-user-id' } as User;

  beforeEach(async () => {
    mockService = mock<VehicleOffensiveResponseConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OffensiveResponseController],
      providers: [
        {
          provide: VehicleOffensiveResponseConfigService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(ConsentGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<OffensiveResponseController>(OffensiveResponseController);
  });

  describe('The updateOffensiveResponse() method', () => {
    describe('When valid break_in_offensive_response is provided', () => {
      it('should call service and return result', async () => {
        mockService.updateOffensiveResponse.mockResolvedValue({
          success: true,
          break_in_offensive_response: OffensiveResponse.HONK,
          break_in_auto_sentry_mode_enabled: false,
        });

        const result = await controller.updateOffensiveResponse('VIN123', mockUser, {
          break_in_offensive_response: OffensiveResponse.HONK,
        });

        expect(mockService.updateOffensiveResponse).toHaveBeenCalledWith(
          'test-user-id',
          'VIN123',
          { break_in_offensive_response: OffensiveResponse.HONK },
        );
        expect(result).toStrictEqual({
          success: true,
          break_in_offensive_response: OffensiveResponse.HONK,
          break_in_auto_sentry_mode_enabled: false,
        });
      });
    });

    describe('When valid break_in_auto_sentry_mode_enabled is provided', () => {
      it('should call service and return result', async () => {
        mockService.updateOffensiveResponse.mockResolvedValue({
          success: true,
          break_in_offensive_response: OffensiveResponse.DISABLED,
          break_in_auto_sentry_mode_enabled: true,
        });

        const result = await controller.updateOffensiveResponse('VIN123', mockUser, {
          break_in_auto_sentry_mode_enabled: true,
        });

        expect(mockService.updateOffensiveResponse).toHaveBeenCalledWith(
          'test-user-id',
          'VIN123',
          { break_in_auto_sentry_mode_enabled: true },
        );
        expect(result).toStrictEqual({
          success: true,
          break_in_offensive_response: OffensiveResponse.DISABLED,
          break_in_auto_sentry_mode_enabled: true,
        });
      });
    });

    describe('When an invalid value is provided', () => {
      it('should throw BadRequestException for invalid break_in_offensive_response', async () => {
        await expect(
          controller.updateOffensiveResponse('VIN123', mockUser, {
            break_in_offensive_response: 'INVALID',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when no field is provided', async () => {
        await expect(
          controller.updateOffensiveResponse('VIN123', mockUser, {}),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when auto sentry is not a boolean', async () => {
        await expect(
          controller.updateOffensiveResponse('VIN123', mockUser, {
            break_in_auto_sentry_mode_enabled: 'yes' as unknown as boolean,
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});
