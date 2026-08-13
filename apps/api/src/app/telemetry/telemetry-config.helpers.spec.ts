import { isVehicleUnreachableError } from './telemetry-config.helpers';

describe('The isVehicleUnreachableError() function', () => {
  const buildAxiosError = (overrides: Record<string, unknown>) => ({
    isAxiosError: true,
    message: 'Request failed',
    ...overrides,
  });

  describe('When Tesla answers with a JSON body', () => {
    it('should detect "context deadline exceeded"', () => {
      const error = buildAxiosError({
        response: { status: 500, data: { error: 'context deadline exceeded', error_description: '' } },
      });

      expect(isVehicleUnreachableError(error)).toBe(true);
    });

    it('should detect an unavailable vehicle', () => {
      const error = buildAxiosError({
        response: { status: 408, data: { error: 'vehicle unavailable: vehicle is offline or asleep' } },
      });

      expect(isVehicleUnreachableError(error)).toBe(true);
    });

    it('should ignore an unrelated Tesla error', () => {
      const error = buildAxiosError({
        response: { status: 500, data: { error: 'internal_error' } },
      });

      expect(isVehicleUnreachableError(error)).toBe(false);
    });
  });

  describe('When the gateway answers with a plain text body', () => {
    it('should detect "context deadline exceeded"', () => {
      const error = buildAxiosError({
        response: { status: 500, data: 'context deadline exceeded' },
      });

      expect(isVehicleUnreachableError(error)).toBe(true);
    });

    it('should ignore an unrelated plain text body', () => {
      const error = buildAxiosError({
        response: { status: 500, data: 'internal server error' },
      });

      expect(isVehicleUnreachableError(error)).toBe(false);
    });
  });

  describe('When the request times out client-side', () => {
    it('should detect an aborted connection', () => {
      const error = buildAxiosError({ code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' });

      expect(isVehicleUnreachableError(error)).toBe(true);
    });
  });

  describe('When the gateway times out', () => {
    it('should detect a 504 response', () => {
      const error = buildAxiosError({ response: { status: 504, data: '' } });

      expect(isVehicleUnreachableError(error)).toBe(true);
    });
  });

  describe('When the error is not an Axios error', () => {
    it('should not classify it as unreachable', () => {
      expect(isVehicleUnreachableError(new Error('context deadline exceeded'))).toBe(false);
    });
  });
});
