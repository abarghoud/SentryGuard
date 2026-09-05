import { ALERT_SOUNDS, DEFAULT_ALERT_SOUND_ID, resolveAlertSound } from './alert-sounds';

describe('The resolveAlertSound() function', () => {
  describe('When a valid sound id is provided', () => {
    it('should return the matching alert sound', () => {
      const sound = resolveAlertSound('tesla_horn.wav');
      expect(sound.id).toBe('tesla_horn.wav');
      expect(sound.labelKey).toBe('settings.soundTeslaHorn');
    });
  });

  describe('When an unknown sound id is provided', () => {
    it('should fallback to the default alert sound', () => {
      const sound = resolveAlertSound('unknown.wav');
      expect(sound.id).toBe(DEFAULT_ALERT_SOUND_ID);
    });
  });

  describe('When undefined is provided', () => {
    it('should fallback to the default alert sound', () => {
      const sound = resolveAlertSound(undefined);
      expect(sound.id).toBe(DEFAULT_ALERT_SOUND_ID);
    });
  });

  describe('The ALERT_SOUNDS constant', () => {
    it('should contain 5 alert sounds', () => {
      expect(ALERT_SOUNDS).toHaveLength(5);
    });
  });
});
