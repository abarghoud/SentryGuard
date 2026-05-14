import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { OffensiveResponseController } from './offensive-response.controller';
import { VehicleOffensiveResponseService } from './vehicle-offensive-response.service';
import { ConsentGuard } from '../../common/guards/consent.guard';
import { User } from '../../entities/user.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';

describe('The OffensiveResponseController class', () => {
  let controller: OffensiveResponseController;
  let mockService: MockProxy<VehicleOffensiveResponseService>;

  const mockUser = { userId: 'test-user-id' } as User;

  beforeEach(async () => {
    mockService = mock<VehicleOffensiveResponseService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OffensiveResponseController],
      providers: [
        {
          provide: VehicleOffensiveResponseService,
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
    describe('When valid sentry_offensive_response is provided', () => {
      it('should call service and return result', async () => {
        mockService.updateOffensiveResponse.mockResolvedValue({
          success: true,
          sentry_offensive_response: OffensiveResponse.HONK,
          break_in_offensive_response: OffensiveResponse.DISABLED,
        });

        const result = await controller.updateOffensiveResponse('VIN123', mockUser, {
          sentry_offensive_response: OffensiveResponse.HONK,
        });

        expect(mockService.updateOffensiveResponse).toHaveBeenCalledWith(
          'test-user-id',
          'VIN123',
          { sentry_offensive_response: OffensiveResponse.HONK },
        );
        expect(result).toStrictEqual({
          success: true,
          sentry_offensive_response: OffensiveResponse.HONK,
          break_in_offensive_response: OffensiveResponse.DISABLED,
        });
      });
    });

    describe('When both fields are provided', () => {
      it('should call service with both fields', async () => {
        mockService.updateOffensiveResponse.mockResolvedValue({
          success: true,
          sentry_offensive_response: OffensiveResponse.HONK,
          break_in_offensive_response: OffensiveResponse.HONK,
        });

        const result = await controller.updateOffensiveResponse('VIN123', mockUser, {
          sentry_offensive_response: OffensiveResponse.HONK,
          break_in_offensive_response: OffensiveResponse.HONK,
        });

        expect(mockService.updateOffensiveResponse).toHaveBeenCalledWith(
          'test-user-id',
          'VIN123',
          { sentry_offensive_response: OffensiveResponse.HONK, break_in_offensive_response: OffensiveResponse.HONK },
        );
      });
    });

    describe('When sentry_offensive_response with duration_minutes is provided', () => {
      it('should call service with duration_minutes', async () => {
        mockService.updateOffensiveResponse.mockResolvedValue({
          success: true,
          sentry_offensive_response: OffensiveResponse.HONK,
          break_in_offensive_response: OffensiveResponse.DISABLED,
          sentry_offensive_response_until: '2026-01-01T00:00:00.000Z',
        });

        await controller.updateOffensiveResponse('VIN123', mockUser, {
          sentry_offensive_response: OffensiveResponse.HONK,
          sentry_offensive_response_duration_minutes: 60,
        });

        expect(mockService.updateOffensiveResponse).toHaveBeenCalledWith(
          'test-user-id',
          'VIN123',
          { sentry_offensive_response: OffensiveResponse.HONK, sentry_offensive_response_duration_minutes: 60 },
        );
      });
    });

    describe('When an invalid value is provided', () => {
      it('should throw BadRequestException for invalid sentry_offensive_response', async () => {
        await expect(
          controller.updateOffensiveResponse('VIN123', mockUser, {
            sentry_offensive_response: 'INVALID',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when neither field is provided', async () => {
        await expect(
          controller.updateOffensiveResponse('VIN123', mockUser, {}),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when duration_minutes provided without HONK', async () => {
        await expect(
          controller.updateOffensiveResponse('VIN123', mockUser, {
            sentry_offensive_response: OffensiveResponse.DISABLED,
            sentry_offensive_response_duration_minutes: 60,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when duration_minutes exceeds max (1440)', async () => {
        await expect(
          controller.updateOffensiveResponse('VIN123', mockUser, {
            sentry_offensive_response: OffensiveResponse.HONK,
            sentry_offensive_response_duration_minutes: 1441,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when duration_minutes is less than 1', async () => {
        await expect(
          controller.updateOffensiveResponse('VIN123', mockUser, {
            sentry_offensive_response: OffensiveResponse.HONK,
            sentry_offensive_response_duration_minutes: 0,
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('The testSentryOffensiveResponse() method', () => {
    it('should call service and return message', async () => {
      mockService.testSentryOffensiveResponse.mockResolvedValue(undefined);

      const result = await controller.testSentryOffensiveResponse('VIN123', mockUser);

      expect(mockService.testSentryOffensiveResponse).toHaveBeenCalledWith('VIN123');
      expect(result).toStrictEqual({
        message: 'Sentry offensive response test triggered for VIN: VIN123',
      });
    });
  });

  describe('The testBreakInOffensiveResponse() method', () => {
    it('should call service and return message', async () => {
      mockService.testBreakInOffensiveResponse.mockResolvedValue(undefined);

      const result = await controller.testBreakInOffensiveResponse('VIN123', mockUser);

      expect(mockService.testBreakInOffensiveResponse).toHaveBeenCalledWith('VIN123');
      expect(result).toStrictEqual({
        message: 'Break-in offensive response test triggered for VIN: VIN123',
      });
    });
  });
});