import { OrientationPolicy, resolveOrientationPolicy } from './orientation-policy';

describe('The resolveOrientationPolicy() function', () => {
  describe('When the window is a phone held upright', () => {
    it('should keep the app in portrait', () => {
      expect(resolveOrientationPolicy({ height: 800, width: 360 })).toBe(OrientationPolicy.PortraitOnly);
    });
  });

  describe('When the window is a phone held sideways', () => {
    it('should keep the app in portrait', () => {
      expect(resolveOrientationPolicy({ height: 360, width: 800 })).toBe(OrientationPolicy.PortraitOnly);
    });
  });

  describe('When the smallest side is just under 600', () => {
    it('should keep the app in portrait', () => {
      expect(resolveOrientationPolicy({ height: 960, width: 599 })).toBe(OrientationPolicy.PortraitOnly);
    });
  });

  describe('When the smallest side is exactly 600', () => {
    it('should let the app rotate', () => {
      expect(resolveOrientationPolicy({ height: 960, width: 600 })).toBe(OrientationPolicy.Free);
    });
  });

  describe('When the window is a tablet held upright', () => {
    it('should let the app rotate', () => {
      expect(resolveOrientationPolicy({ height: 1280, width: 800 })).toBe(OrientationPolicy.Free);
    });
  });

  describe('When the window is a tablet held sideways', () => {
    it('should let the app rotate', () => {
      expect(resolveOrientationPolicy({ height: 800, width: 1280 })).toBe(OrientationPolicy.Free);
    });
  });
});
