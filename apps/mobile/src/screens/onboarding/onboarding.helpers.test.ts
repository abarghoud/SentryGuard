jest.mock('expo-linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../core/api', () => ({
  virtualKeyStore: { resolveUrl: jest.fn(() => '') },
}));

import { Vehicle } from '../../features/vehicles/domain/entities';
import { resolveVehicleStepKey, selectTelemetryVehicle } from './onboarding.helpers';

const createVehicle = (overrides: Partial<Vehicle>): Vehicle =>
  ({
    break_in_monitoring_enabled: false,
    id: 'vehicle-1',
    sentry_mode_monitoring_enabled: false,
    vin: 'VIN-1',
    ...overrides,
  }) as Vehicle;

describe('The selectTelemetryVehicle() function', () => {
  describe('When an unmonitored vehicle has its virtual key paired', () => {
    it('should prefer the vehicle with the paired key', () => {
      const unpairedVehicle = createVehicle({ key_paired: false, vin: 'VIN-1' });
      const pairedVehicle = createVehicle({ key_paired: true, vin: 'VIN-2' });

      expect(selectTelemetryVehicle([unpairedVehicle, pairedVehicle])).toBe(pairedVehicle);
    });
  });

  describe('When no unmonitored vehicle has a paired key', () => {
    it('should fall back to the first unmonitored vehicle', () => {
      const monitoredVehicle = createVehicle({ key_paired: true, sentry_mode_monitoring_enabled: true, vin: 'VIN-1' });
      const unpairedVehicle = createVehicle({ key_paired: false, vin: 'VIN-2' });

      expect(selectTelemetryVehicle([monitoredVehicle, unpairedVehicle])).toBe(unpairedVehicle);
    });
  });

  describe('When every vehicle is already monitored', () => {
    it('should fall back to the first vehicle', () => {
      const firstVehicle = createVehicle({ key_paired: true, sentry_mode_monitoring_enabled: true, vin: 'VIN-1' });
      const secondVehicle = createVehicle({ key_paired: true, sentry_mode_monitoring_enabled: true, vin: 'VIN-2' });

      expect(selectTelemetryVehicle([firstVehicle, secondVehicle])).toBe(firstVehicle);
    });
  });

  describe('When there is no vehicle', () => {
    it('should return null', () => {
      expect(selectTelemetryVehicle([])).toBeNull();
    });
  });
});

describe('The resolveVehicleStepKey() function', () => {
  describe('When the vehicle is monitored', () => {
    it('should return the enabled key', () => {
      const vehicle = createVehicle({ key_paired: true, sentry_mode_monitoring_enabled: true });

      expect(resolveVehicleStepKey(vehicle)).toBe('onboarding.vehicleEnabled');
    });
  });

  describe('When the vehicle is unmonitored without a paired key', () => {
    it('should return the key-missing key if protocol is required', () => {
      const vehicle = createVehicle({ key_paired: false, vehicle_command_protocol_required: true });

      expect(resolveVehicleStepKey(vehicle)).toBe('onboarding.vehicleKeyMissing');
    });

    it('should return the disabled key if protocol is not required', () => {
      const vehicle = createVehicle({ key_paired: false, vehicle_command_protocol_required: false });

      expect(resolveVehicleStepKey(vehicle)).toBe('onboarding.vehicleDisabled');
    });
  });

  describe('When the vehicle is unmonitored with a paired key', () => {
    it('should return the disabled key', () => {
      const vehicle = createVehicle({ key_paired: true });

      expect(resolveVehicleStepKey(vehicle)).toBe('onboarding.vehicleDisabled');
    });
  });
});
