import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { Vehicle } from '../../../entities/vehicle.entity';
import { BreakInSensitivity } from '../enums/break-in-sensitivity.enum';
import { OffensiveResponse } from '../enums/offensive-response.enum';
import { VehicleBreakInDetectionSettingsService } from './vehicle-break-in-detection-settings.service';

describe('The VehicleBreakInDetectionSettingsService class', () => {
  const fakeVin = 'XP7YGCER1TB919128';
  let mockVehicleRepository: MockProxy<Repository<Vehicle>>;
  let service: VehicleBreakInDetectionSettingsService;

  const buildVehicle = (
    userId: string,
    sensitivity: BreakInSensitivity,
    reactionDelaySeconds: number,
    counterMeasures: Partial<Vehicle> = { break_in_offensive_response: OffensiveResponse.HONK }
  ): Vehicle =>
    ({
      break_in_auto_sentry_mode_enabled: false,
      break_in_offensive_response: OffensiveResponse.DISABLED,
      break_in_reaction_delay_seconds: reactionDelaySeconds,
      break_in_sensitivity: sensitivity,
      userId,
      ...counterMeasures,
    }) as Vehicle;

  beforeEach(() => {
    mockVehicleRepository = mock<Repository<Vehicle>>();
    service = new VehicleBreakInDetectionSettingsService(mockVehicleRepository);
  });

  describe('The findGroupsByVin() method', () => {
    describe('When the co-owners share the same settings', () => {
      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([
          buildVehicle('user-1', BreakInSensitivity.SinglePull, 3),
          buildVehicle('user-2', BreakInSensitivity.SinglePull, 3),
        ]);
      });

      it('should return a single group with every user', async () => {
        expect(await service.findGroupsByVin(fakeVin)).toStrictEqual([
          { hasCounterMeasures: true, reactionDelaySeconds: 3, sensitivity: BreakInSensitivity.SinglePull, userIds: ['user-1', 'user-2'] },
        ]);
      });
    });

    describe('When the co-owners have different settings', () => {
      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([
          buildVehicle('user-1', BreakInSensitivity.SinglePull, 3),
          buildVehicle('user-2', BreakInSensitivity.RepeatedPulls, 20),
        ]);
      });

      it('should return one group per settings', async () => {
        expect(await service.findGroupsByVin(fakeVin)).toStrictEqual([
          { hasCounterMeasures: true, reactionDelaySeconds: 3, sensitivity: BreakInSensitivity.SinglePull, userIds: ['user-1'] },
          { hasCounterMeasures: true, reactionDelaySeconds: 20, sensitivity: BreakInSensitivity.RepeatedPulls, userIds: ['user-2'] },
        ]);
      });
    });

    describe('When a vehicle holds an unsupported reaction delay', () => {
      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([buildVehicle('user-1', BreakInSensitivity.RepeatedPulls, 7)]);
      });

      it('should fall back to the default reaction delay', async () => {
        expect(await service.findGroupsByVin(fakeVin)).toStrictEqual([
          { hasCounterMeasures: true, reactionDelaySeconds: 5, sensitivity: BreakInSensitivity.RepeatedPulls, userIds: ['user-1'] },
        ]);
      });
    });

    describe('When no co-owner of a group enabled a counter-measure', () => {
      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([buildVehicle('user-1', BreakInSensitivity.SinglePull, 3, {})]);
      });

      it('should flag the group as having no counter-measure', async () => {
        expect((await service.findGroupsByVin(fakeVin))[0].hasCounterMeasures).toStrictEqual(false);
      });
    });

    describe('When one co-owner of a group only enabled the auto sentry', () => {
      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([
          buildVehicle('user-1', BreakInSensitivity.SinglePull, 3, {}),
          buildVehicle('user-2', BreakInSensitivity.SinglePull, 3, { break_in_auto_sentry_mode_enabled: true }),
        ]);
      });

      it('should flag the group as having counter-measures', async () => {
        expect((await service.findGroupsByVin(fakeVin))[0].hasCounterMeasures).toStrictEqual(true);
      });
    });
  });
});
