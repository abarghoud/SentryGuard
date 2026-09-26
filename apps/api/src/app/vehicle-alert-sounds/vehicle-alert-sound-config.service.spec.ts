import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { Vehicle } from '../../entities/vehicle.entity';
import { AlertSound } from '../alerts/enums/alert-sound.enum';
import { VehicleAlertSoundConfigService } from './vehicle-alert-sound-config.service';

describe('The VehicleAlertSoundConfigService class', () => {
  const fakeUserId = 'user-123';
  const fakeVin = '5YJ3E1EA8KF123456';
  let mockVehicleRepository: MockProxy<Repository<Vehicle>>;
  let service: VehicleAlertSoundConfigService;

  const createVehicle = (): Vehicle =>
    ({
      break_in_alert_sound: AlertSound.SentrySiren,
      sentry_alert_sound: AlertSound.SentrySiren,
      userId: fakeUserId,
      vin: fakeVin,
    }) as Vehicle;

  beforeEach(() => {
    mockVehicleRepository = mock<Repository<Vehicle>>();
    mockVehicleRepository.save.mockImplementation(async (vehicle) => vehicle as Vehicle);
    service = new VehicleAlertSoundConfigService(mockVehicleRepository);
  });

  describe('The updateAlertSounds() method', () => {
    describe('When the vehicle does not belong to the user', () => {
      let result: { success: boolean };

      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue(null);

        result = await service.updateAlertSounds(fakeUserId, fakeVin, {
          sentry_alert_sound: AlertSound.CyberPulse,
        });
      });

      it('should report an unsuccessful update', () => {
        expect(result.success).toBe(false);
      });

      it('should not save anything', () => {
        expect(mockVehicleRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('When only the sentry sound is provided', () => {
      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue(createVehicle());

        await service.updateAlertSounds(fakeUserId, fakeVin, { sentry_alert_sound: AlertSound.CyberPulse });
      });

      it('should persist the new sentry sound', () => {
        expect(mockVehicleRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ sentry_alert_sound: AlertSound.CyberPulse })
        );
      });

      it('should leave the break-in sound untouched', () => {
        expect(mockVehicleRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ break_in_alert_sound: AlertSound.SentrySiren })
        );
      });
    });

    describe('When both sounds are provided', () => {
      let result: { break_in_alert_sound?: string; sentry_alert_sound?: string; success: boolean };

      beforeEach(async () => {
        mockVehicleRepository.findOne.mockResolvedValue(createVehicle());

        result = await service.updateAlertSounds(fakeUserId, fakeVin, {
          break_in_alert_sound: AlertSound.KlaxonAlarm,
          sentry_alert_sound: AlertSound.PhoneDefault,
        });
      });

      it('should return both persisted sounds', () => {
        expect(result).toStrictEqual({
          break_in_alert_sound: AlertSound.KlaxonAlarm,
          sentry_alert_sound: AlertSound.PhoneDefault,
          success: true,
        });
      });
    });
  });
});
