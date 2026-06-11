jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios ?? spec.default },
}));

import { scaleSpecForAndroid } from './typography';

describe('The scaleSpecForAndroid() function', () => {
  const bodySpec = { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.43, lineHeight: 22 };

  describe('When adapting a spec for Android', () => {
    it('should neutralize the San Francisco letter spacing for Roboto', () => {
      expect(scaleSpecForAndroid(bodySpec).letterSpacing).toBe(0);
    });

    it('should keep the font weight untouched', () => {
      expect(scaleSpecForAndroid(bodySpec).fontWeight).toBe('400');
    });

    it('should produce whole pixel sizes', () => {
      const scaled = scaleSpecForAndroid(bodySpec);

      expect([scaled.fontSize, scaled.lineHeight]).toStrictEqual([Math.round(scaled.fontSize), Math.round(scaled.lineHeight)]);
    });
  });

  describe('When the size is at the readability floor', () => {
    it('should never scale below the minimum readable size', () => {
      expect(scaleSpecForAndroid({ fontSize: 11, fontWeight: '400', letterSpacing: 0.07, lineHeight: 13 }).fontSize).toBeGreaterThanOrEqual(11);
    });
  });
});
