import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';

import { BreakInDetectionController } from './break-in-detection.controller';
import { VehicleBreakInDetectionConfigService } from './vehicle-break-in-detection-config.service';
import { ConsentGuard } from '../../common/guards/consent.guard';
import { User } from '../../entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BreakInSensitivity } from '../alerts/enums/break-in-sensitivity.enum';

describe('The BreakInDetectionController class', () => {
  const fakeUser = { userId: 'user-1' } as User;
  const fakeVin = 'XP7YGCER1TB919128';
  const settings = { reactionDelaySeconds: 20, sensitivity: BreakInSensitivity.RepeatedPulls };
  let controller: BreakInDetectionController;
  let mockConfigService: MockProxy<VehicleBreakInDetectionConfigService>;

  beforeEach(async () => {
    mockConfigService = mock<VehicleBreakInDetectionConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BreakInDetectionController],
      providers: [{ provide: VehicleBreakInDetectionConfigService, useValue: mockConfigService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(ConsentGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(BreakInDetectionController);
  });

  describe('The controller', () => {
    it('should require an authenticated user who gave consent', () => {
      expect(Reflect.getMetadata(GUARDS_METADATA, BreakInDetectionController)).toStrictEqual([JwtAuthGuard, ConsentGuard]);
    });
  });

  describe('The updateBreakInDetection() method', () => {
    describe('When the vehicle belongs to the user', () => {
      let result: unknown;

      beforeEach(async () => {
        mockConfigService.updateBreakInDetection.mockResolvedValue({ ...settings, success: true });

        result = await controller.updateBreakInDetection(fakeVin, fakeUser, settings);
      });

      it('should update the settings of the user vehicle', () => {
        expect(mockConfigService.updateBreakInDetection).toHaveBeenCalledWith('user-1', fakeVin, settings);
      });

      it('should return the saved settings', () => {
        expect(result).toStrictEqual({ ...settings, success: true });
      });
    });

    describe('When the vehicle does not belong to the user', () => {
      beforeEach(() => {
        mockConfigService.updateBreakInDetection.mockResolvedValue({ success: false });
      });

      it('should report the failure', async () => {
        expect(await controller.updateBreakInDetection(fakeVin, fakeUser, settings)).toStrictEqual({ success: false });
      });
    });
  });
});
