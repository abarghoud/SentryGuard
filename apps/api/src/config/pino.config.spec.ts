import { IncomingMessage } from 'http';
import { Options } from 'pino-http';

import { getPinoConfig } from './pino.config';

const serializeRequest = (url: string, params: Record<string, unknown>): Record<string, unknown> => {
  const { serializers } = getPinoConfig(null).pinoHttp as Options;
  const request = { headers: {}, method: 'POST', params, url } as unknown as IncomingMessage;

  return (serializers as { req: (request: IncomingMessage) => Record<string, unknown> }).req(request);
};

describe('The getPinoConfig() function', () => {
  const fakeSecretPath = 'fake-secret-path-0123456789';

  describe('When a Telegram webhook request is logged', () => {
    let serialized: Record<string, unknown>;

    beforeEach(() => {
      serialized = serializeRequest(`/telegram/webhook/${fakeSecretPath}?retry=1`, { path: ['telegram', 'webhook', fakeSecretPath] });
    });

    it('should hide the secret path of the URL', () => {
      expect(serialized.url).toBe('/telegram/webhook/<redacted>?retry=1');
    });

    it('should not log the secret path anywhere else', () => {
      expect(JSON.stringify(serialized)).not.toContain(fakeSecretPath);
    });
  });

  describe('When another request is logged', () => {
    it('should keep its URL and params', () => {
      const serialized = serializeRequest('/vehicles/VIN-1/break-in-detection', { vin: 'VIN-1' });

      expect({ params: serialized.params, url: serialized.url }).toStrictEqual({ params: { vin: 'VIN-1' }, url: '/vehicles/VIN-1/break-in-detection' });
    });
  });
});
