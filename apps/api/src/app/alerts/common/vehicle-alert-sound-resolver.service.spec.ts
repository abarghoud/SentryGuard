import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { AlertEventType } from '../../../entities/alert-event.entity';
import { Vehicle } from '../../../entities/vehicle.entity';
import { AlertSound } from '../enums/alert-sound.enum';
import { VehicleAlertSoundResolverService } from './vehicle-alert-sound-resolver.service';

describe('The VehicleAlertSoundResolverService class', () => {
  const fakeUserId = 'user-123';
  const fakeVin = '5YJ3E1EA8KF123456';
  let mockVehicleRepository: MockProxy<Repository<Vehicle>>;
  let service: VehicleAlertSoundResolverService;

  beforeEach(() => {
    mockVehicleRepository = mock<Repository<Vehicle>>();
    service = new VehicleAlertSoundResolverService(mockVehicleRepository);
  });

  describe('The resolve() method', () => {
    describe('When the vehicle defines a sound for each alert type', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          break_in_alert_sound: AlertSound.KlaxonAlarm,
          sentry_alert_sound: AlertSound.CyberPulse,
        } as Vehicle);
      });

      it('should return the sentry sound for a Sentry alert', async () => {
        await expect(service.resolve(fakeUserId, fakeVin, AlertEventType.Sentry)).resolves.toBe(AlertSound.CyberPulse);
      });

      it('should return the break-in sound for a BreakIn alert', async () => {
        await expect(service.resolve(fakeUserId, fakeVin, AlertEventType.BreakIn)).resolves.toBe(
          AlertSound.KlaxonAlarm
        );
      });

      it('should look the vehicle up for the alerted user', async () => {
        await service.resolve(fakeUserId, fakeVin, AlertEventType.Sentry);

        expect(mockVehicleRepository.findOne).toHaveBeenCalledWith(
          expect.objectContaining({ where: { userId: fakeUserId, vin: fakeVin } })
        );
      });
    });

    describe('When the vehicle is configured with the phone default sound', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          break_in_alert_sound: AlertSound.PhoneDefault,
          sentry_alert_sound: AlertSound.PhoneDefault,
        } as Vehicle);
      });

      it('should preserve the phone default sentinel', async () => {
        await expect(service.resolve(fakeUserId, fakeVin, AlertEventType.BreakIn)).resolves.toBe(
          AlertSound.PhoneDefault
        );
      });
    });

    describe('When no vehicle matches the user and VIN', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue(null);
      });

      it('should return the phone default sound', async () => {
        await expect(service.resolve(fakeUserId, fakeVin, AlertEventType.Sentry)).resolves.toBe(
          AlertSound.PhoneDefault
        );
      });
    });

    describe('When the stored sound is not a known alert sound', () => {
      beforeEach(() => {
        mockVehicleRepository.findOne.mockResolvedValue({
          break_in_alert_sound: 'removed_sound.wav',
          sentry_alert_sound: 'removed_sound.wav',
        } as Vehicle);
      });

      it('should return the phone default sound instead of an unroutable channel', async () => {
        await expect(service.resolve(fakeUserId, fakeVin, AlertEventType.BreakIn)).resolves.toBe(
          AlertSound.PhoneDefault
        );
      });
    });
  });
});
