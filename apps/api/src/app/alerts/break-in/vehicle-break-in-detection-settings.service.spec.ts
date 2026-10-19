import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { Vehicle } from '../../../entities/vehicle.entity';
import { BreakInSensitivity } from '../enums/break-in-sensitivity.enum';
import { OffensiveResponse } from '../enums/offensive-response.enum';
import { BreakInDetectionVehicle, VehicleBreakInDetectionSettingsService } from './vehicle-break-in-detection-settings.service';

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
      display_name: `Tesla of ${userId}`,
      id: `vehicle-${userId}`,
      userId,
      vin: fakeVin,
      ...counterMeasures,
    }) as Vehicle;

  const expectVehicle = (vehicle: Vehicle): BreakInDetectionVehicle => ({
    break_in_auto_sentry_mode_enabled: vehicle.break_in_auto_sentry_mode_enabled,
    break_in_offensive_response: vehicle.break_in_offensive_response,
    display_name: vehicle.display_name,
    userId: vehicle.userId,
    vin: vehicle.vin,
  });

  beforeEach(() => {
    mockVehicleRepository = mock<Repository<Vehicle>>();
    service = new VehicleBreakInDetectionSettingsService(mockVehicleRepository);
  });

  describe('The findGroupsByVin() method', () => {
    describe('When the co-owners share the same settings', () => {
      const firstVehicle = buildVehicle('user-1', BreakInSensitivity.SinglePull, 3);
      const secondVehicle = buildVehicle('user-2', BreakInSensitivity.SinglePull, 3);

      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([firstVehicle, secondVehicle]);
      });

      it('should return a single group with every vehicle', async () => {
        expect(await service.findGroupsByVin(fakeVin)).toStrictEqual([
          {
            hasCounterMeasures: true,
            reactionDelaySeconds: 3,
            sensitivity: BreakInSensitivity.SinglePull,
            vehicles: [expectVehicle(firstVehicle), expectVehicle(secondVehicle)],
          },
        ]);
      });

      it('should only read the columns the break-in handling needs', async () => {
        await service.findGroupsByVin(fakeVin);

        expect(mockVehicleRepository.find).toHaveBeenCalledWith({
          where: { vin: fakeVin },
          select: {
            break_in_auto_sentry_mode_enabled: true,
            break_in_offensive_response: true,
            break_in_reaction_delay_seconds: true,
            break_in_sensitivity: true,
            display_name: true,
            userId: true,
            vin: true,
          },
        });
      });
    });

    describe('When the co-owners have different settings', () => {
      const firstVehicle = buildVehicle('user-1', BreakInSensitivity.SinglePull, 3);
      const secondVehicle = buildVehicle('user-2', BreakInSensitivity.RepeatedPulls, 20);

      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([firstVehicle, secondVehicle]);
      });

      it('should return one group per settings', async () => {
        expect(await service.findGroupsByVin(fakeVin)).toStrictEqual([
          { hasCounterMeasures: true, reactionDelaySeconds: 3, sensitivity: BreakInSensitivity.SinglePull, vehicles: [expectVehicle(firstVehicle)] },
          { hasCounterMeasures: true, reactionDelaySeconds: 20, sensitivity: BreakInSensitivity.RepeatedPulls, vehicles: [expectVehicle(secondVehicle)] },
        ]);
      });
    });

    describe('When a vehicle holds an unsupported reaction delay', () => {
      beforeEach(() => {
        mockVehicleRepository.find.mockResolvedValue([buildVehicle('user-1', BreakInSensitivity.RepeatedPulls, 7)]);
      });

      it('should fall back to the default reaction delay', async () => {
        expect((await service.findGroupsByVin(fakeVin))[0].reactionDelaySeconds).toStrictEqual(5);
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
