import { mock, MockProxy } from 'jest-mock-extended';
import { Repository, UpdateResult } from 'typeorm';

import { Vehicle } from '../../entities/vehicle.entity';
import { BreakInSensitivity } from '../alerts/enums/break-in-sensitivity.enum';
import { VehicleBreakInDetectionConfigService } from './vehicle-break-in-detection-config.service';

describe('The VehicleBreakInDetectionConfigService class', () => {
  const fakeUserId = 'user-1';
  const fakeVin = 'XP7YGCER1TB919128';
  const fakeSettings = { reactionDelaySeconds: 20, sensitivity: BreakInSensitivity.RepeatedPulls };
  let mockVehicleRepository: MockProxy<Repository<Vehicle>>;
  let service: VehicleBreakInDetectionConfigService;

  beforeEach(() => {
    mockVehicleRepository = mock<Repository<Vehicle>>();
    service = new VehicleBreakInDetectionConfigService(mockVehicleRepository);
  });

  describe('The updateBreakInDetection() method', () => {
    describe('When the vehicle belongs to the user', () => {
      let result: unknown;

      beforeEach(async () => {
        mockVehicleRepository.update.mockResolvedValue({ affected: 1 } as UpdateResult);

        result = await service.updateBreakInDetection(fakeUserId, fakeVin, fakeSettings);
      });

      it('should store the settings on the user vehicle', () => {
        expect(mockVehicleRepository.update).toHaveBeenCalledWith(
          { userId: fakeUserId, vin: fakeVin },
          { break_in_reaction_delay_seconds: 20, break_in_sensitivity: BreakInSensitivity.RepeatedPulls }
        );
      });

      it('should return the stored settings', () => {
        expect(result).toStrictEqual({ ...fakeSettings, success: true });
      });
    });

    describe('When the vehicle does not belong to the user', () => {
      beforeEach(() => {
        mockVehicleRepository.update.mockResolvedValue({ affected: 0 } as UpdateResult);
      });

      it('should report a failure', async () => {
        expect(await service.updateBreakInDetection(fakeUserId, fakeVin, fakeSettings)).toStrictEqual({ success: false });
      });
    });
  });
});
