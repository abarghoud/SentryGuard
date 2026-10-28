import {
  BreakInDetection,
  BreakInSensitivity,
  readBreakInDetection,
  toBreakInDetectionFields,
} from './break-in-detection';

describe('The break-in detection rules', () => {
  const defaultBreakInDetection: BreakInDetection = {
    reactionDelaySeconds: 5,
    sensitivity: BreakInSensitivity.SinglePull,
  };
  const fakeBreakInDetection: BreakInDetection = {
    reactionDelaySeconds: 20,
    sensitivity: BreakInSensitivity.RepeatedPulls,
  };

  describe('The readBreakInDetection() function', () => {
    describe('When the vehicle has no break-in detection fields', () => {
      it('should fall back to the defaults', () => {
        expect(readBreakInDetection({})).toStrictEqual(defaultBreakInDetection);
      });
    });

    describe('When the vehicle has break-in detection fields', () => {
      it('should map them to the break-in detection settings', () => {
        expect(
          readBreakInDetection(toBreakInDetectionFields(fakeBreakInDetection))
        ).toStrictEqual(fakeBreakInDetection);
      });
    });

    describe('When the vehicle has unknown break-in detection values', () => {
      it('should fall back to the defaults', () => {
        expect(
          readBreakInDetection({
            break_in_reaction_delay_seconds: 7,
            break_in_sensitivity: 'loud' as BreakInSensitivity,
          })
        ).toStrictEqual(defaultBreakInDetection);
      });
    });
  });

  describe('The toBreakInDetectionFields() function', () => {
    it('should map the settings to the vehicle fields', () => {
      expect(toBreakInDetectionFields(fakeBreakInDetection)).toStrictEqual({
        break_in_reaction_delay_seconds: 20,
        break_in_sensitivity: BreakInSensitivity.RepeatedPulls,
      });
    });
  });
});
