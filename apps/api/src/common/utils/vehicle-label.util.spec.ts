import { resolveVehicleLabel } from './vehicle-label.util';

describe('The resolveVehicleLabel() function', () => {
  describe('When a display name is provided', () => {
    it('should return the display name', () => {
      expect(resolveVehicleLabel('My Tesla', 'VIN123')).toBe('My Tesla');
    });
  });

  describe('When the display name is undefined', () => {
    it('should return the VIN', () => {
      expect(resolveVehicleLabel(undefined, 'VIN123')).toBe('VIN123');
    });
  });

  describe('When the display name is null', () => {
    it('should return the VIN', () => {
      expect(resolveVehicleLabel(null, 'VIN123')).toBe('VIN123');
    });
  });

  describe('When the display name is an empty string', () => {
    it('should return the VIN', () => {
      expect(resolveVehicleLabel('', 'VIN123')).toBe('VIN123');
    });
  });
});
