jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios ?? spec.default },
}));

import { scaleSpecForAndroid } from './typography';

describe('The scaleSpecForAndroid() function', () => {
  describe('When scaling the body size', () => {
    it('should bring the iOS 17pt down to the Android 16dp convention', () => {
      expect(scaleSpecForAndroid({ fontSize: 17, fontWeight: '400', letterSpacing: -0.43, lineHeight: 22 })).toStrictEqual({
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0,
        lineHeight: 21,
      });
    });
  });

  describe('When the size is already at the readability floor', () => {
    it('should not scale below the minimum readable size', () => {
      expect(scaleSpecForAndroid({ fontSize: 11, fontWeight: '400', letterSpacing: 0.07, lineHeight: 13 }).fontSize).toBe(11);
    });
  });

  describe('When the spec carries San Francisco letter spacing', () => {
    it('should neutralize the letter spacing for Roboto', () => {
      expect(scaleSpecForAndroid({ fontSize: 34, fontWeight: '700', letterSpacing: 0.4, lineHeight: 41 }).letterSpacing).toBe(0);
    });
  });
});
