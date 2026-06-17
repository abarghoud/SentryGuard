import { VehicleAlertMessage } from './vehicle-alert-message.model';

describe('The VehicleAlertMessage class', () => {
  describe('The constructor', () => {
    describe('When given camelCase fields', () => {
      let message: VehicleAlertMessage;

      beforeEach(() => {
        message = new VehicleAlertMessage({
          vin: 'VIN1',
          createdAt: '2026-01-01T00:00:00Z',
          alerts: [{ name: 'VCSEC_a133_alarmTriggered', audiences: ['service'], startedAt: '2026-01-01T00:00:00Z', endedAt: null }],
        });
      });

      it('should expose the vin', () => {
        expect(message.vin).toBe('VIN1');
      });

      it('should parse the alert name', () => {
        expect(message.alerts[0].name).toBe('VCSEC_a133_alarmTriggered');
      });
    });

    describe('When given snake_case fields', () => {
      let message: VehicleAlertMessage;

      beforeEach(() => {
        message = new VehicleAlertMessage({
          vin: 'VIN1',
          created_at: '2026-01-01T00:00:00Z',
          alerts: [{ name: 'X', audiences: ['service'], started_at: 'start', ended_at: 'end' }],
        });
      });

      it('should normalize created_at to createdAt', () => {
        expect(message.createdAt).toBe('2026-01-01T00:00:00Z');
      });

      it('should normalize ended_at to endedAt', () => {
        expect(message.alerts[0].endedAt).toBe('end');
      });
    });
  });

  describe('The isActive() method', () => {
    const message = new VehicleAlertMessage({ vin: 'V', createdAt: 'c', alerts: [] });

    describe('When the alert has no endedAt', () => {
      it('should return true', () => {
        expect(message.isActive({ name: 'X', audiences: [], endedAt: null })).toBe(true);
      });
    });

    describe('When the alert has an endedAt', () => {
      it('should return false', () => {
        expect(message.isActive({ name: 'X', audiences: [], endedAt: 'end' })).toBe(false);
      });
    });
  });
});
