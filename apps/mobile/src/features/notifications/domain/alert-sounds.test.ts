import {
  ALERT_SOUNDS,
  PHONE_DEFAULT_ALERT_SOUND_ID,
  resolveAlertSound,
  SELECTABLE_ALERT_SOUNDS,
} from './alert-sounds';

describe('The resolveAlertSound() function', () => {
  describe('When a valid sound id is provided', () => {
    it('should return the matching alert sound', () => {
      const sound = resolveAlertSound('tesla_horn.wav');
      expect(sound.id).toBe('tesla_horn.wav');
      expect(sound.labelKey).toBe('settings.soundTeslaHorn');
    });
  });

  describe('When an unknown sound id is provided', () => {
    it('should fallback to the phone default sound', () => {
      const sound = resolveAlertSound('unknown.wav');
      expect(sound.id).toBe(PHONE_DEFAULT_ALERT_SOUND_ID);
    });
  });

  describe('When undefined is provided', () => {
    it('should fallback to the phone default sound', () => {
      const sound = resolveAlertSound(undefined);
      expect(sound.id).toBe(PHONE_DEFAULT_ALERT_SOUND_ID);
    });
  });

  describe('When the phone default id is provided', () => {
    it('should return the phone default sound', () => {
      const sound = resolveAlertSound(PHONE_DEFAULT_ALERT_SOUND_ID);
      expect(sound.labelKey).toBe('settings.soundPhoneDefault');
    });
  });

  describe('The ALERT_SOUNDS constant', () => {
    it('should contain 5 alert sounds', () => {
      expect(ALERT_SOUNDS).toHaveLength(5);
    });

    it('should only contain sounds bundled with the application', () => {
      expect(ALERT_SOUNDS.every((sound) => sound.asset !== null)).toBe(true);
    });
  });

  describe('The SELECTABLE_ALERT_SOUNDS constant', () => {
    it('should offer the phone default first', () => {
      expect(SELECTABLE_ALERT_SOUNDS[0].id).toBe(PHONE_DEFAULT_ALERT_SOUND_ID);
    });

    it('should offer the phone default without a previewable asset', () => {
      expect(SELECTABLE_ALERT_SOUNDS[0].asset).toBeNull();
    });
  });
});
