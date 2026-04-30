import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { BreakInMonitoringController } from './break-in-monitoring.controller';
import { BreakInMonitoringConfigService } from './break-in-monitoring-config.service';
import { User } from '../../entities/user.entity';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConsentGuard } from '../../common/guards/consent.guard';
import { BetaTesterGuard } from '../guards/beta-tester.guard';

describe('The BreakInMonitoringController class', () => {
  let controller: BreakInMonitoringController;
  let service: BreakInMonitoringConfigService;

  let mockBreakInMonitoringConfigService: MockProxy<BreakInMonitoringConfigService>;

  beforeEach(async () => {
    mockBreakInMonitoringConfigService = mock<BreakInMonitoringConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BreakInMonitoringController],
      providers: [
        {
          provide: BreakInMonitoringConfigService,
          useValue: mockBreakInMonitoringConfigService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(ConsentGuard).useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(BetaTesterGuard).useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<BreakInMonitoringController>(BreakInMonitoringController);
    service = module.get<BreakInMonitoringConfigService>(BreakInMonitoringConfigService);
  });

  describe('The enableFeature() method', () => {
    describe('When called with valid parameters', () => {
      let result: { success: boolean; message: string };
      const vin = 'VIN123';
      const user = { userId: 'user-1' } as User;
      const expectedResult = { success: true, message: 'Enabled' };

      beforeEach(async () => {
        mockBreakInMonitoringConfigService.toggleBreakInMonitoring.mockResolvedValue(expectedResult);
        result = await controller.enableFeature(vin, user);
      });

      it('should return the success result', () => {
        expect(result).toEqual(expectedResult);
      });

      it('should call service to enable break-in monitoring', () => {
        expect(service.toggleBreakInMonitoring).toHaveBeenCalledWith(vin, user.userId, true);
      });
    });
  });

  describe('The disableFeature() method', () => {
    describe('When called with valid parameters', () => {
      let result: { success: boolean; message: string };
      const vin = 'VIN123';
      const user = { userId: 'user-1' } as User;
      const expectedResult = { success: true, message: 'Disabled' };

      beforeEach(async () => {
        mockBreakInMonitoringConfigService.toggleBreakInMonitoring.mockResolvedValue(expectedResult);
        result = await controller.disableFeature(vin, user);
      });

      it('should return the success result', () => {
        expect(result).toEqual(expectedResult);
      });

      it('should call service to disable break-in monitoring', () => {
        expect(service.toggleBreakInMonitoring).toHaveBeenCalledWith(vin, user.userId, false);
      });
    });
  });
});

