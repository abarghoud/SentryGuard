import { BadRequestException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';

import { User } from '../../entities/user.entity';
import { AlertSound } from '../alerts/enums/alert-sound.enum';
import { VehicleAlertSoundConfigService } from './vehicle-alert-sound-config.service';
import { VehicleAlertSoundsController } from './vehicle-alert-sounds.controller';

describe('The VehicleAlertSoundsController class', () => {
  const fakeVin = '5YJ3E1EA8KF123456';
  const fakeUser = { userId: 'user-123' } as User;
  let mockVehicleAlertSoundConfigService: MockProxy<VehicleAlertSoundConfigService>;
  let controller: VehicleAlertSoundsController;

  beforeEach(() => {
    mockVehicleAlertSoundConfigService = mock<VehicleAlertSoundConfigService>();
    mockVehicleAlertSoundConfigService.updateAlertSounds.mockResolvedValue({ success: true });
    controller = new VehicleAlertSoundsController(mockVehicleAlertSoundConfigService);
  });

  describe('The updateAlertSounds() method', () => {
    describe('When no sound is provided', () => {
      const expectedError = 'sentry_alert_sound or break_in_alert_sound must be provided';
      let act: () => Promise<unknown>;

      beforeEach(() => {
        act = async () => await controller.updateAlertSounds(fakeVin, fakeUser, {});
      });

      it('should reject the update', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });

      it('should not reach the configuration service', async () => {
        await expect(act()).rejects.toThrow(BadRequestException);
        expect(mockVehicleAlertSoundConfigService.updateAlertSounds).not.toHaveBeenCalled();
      });
    });

    describe('When a sound is not part of the catalogue', () => {
      let act: () => Promise<unknown>;

      beforeEach(() => {
        act = async () =>
          await controller.updateAlertSounds(fakeVin, fakeUser, { sentry_alert_sound: 'removed_sound.wav' });
      });

      it('should reject the update', async () => {
        await expect(act()).rejects.toThrow(BadRequestException);
      });
    });

    describe('When only the break-in sound is provided', () => {
      beforeEach(async () => {
        await controller.updateAlertSounds(fakeVin, fakeUser, { break_in_alert_sound: AlertSound.KlaxonAlarm });
      });

      it('should forward the partial update for the current user', () => {
        expect(mockVehicleAlertSoundConfigService.updateAlertSounds).toHaveBeenCalledWith(fakeUser.userId, fakeVin, {
          break_in_alert_sound: AlertSound.KlaxonAlarm,
        });
      });
    });

    describe('When the phone default sound is provided', () => {
      beforeEach(async () => {
        await controller.updateAlertSounds(fakeVin, fakeUser, { sentry_alert_sound: AlertSound.PhoneDefault });
      });

      it('should accept the phone default sentinel', () => {
        expect(mockVehicleAlertSoundConfigService.updateAlertSounds).toHaveBeenCalledWith(fakeUser.userId, fakeVin, {
          sentry_alert_sound: AlertSound.PhoneDefault,
        });
      });
    });
  });
});
