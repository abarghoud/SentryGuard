import * as dns from 'dns';
import { createIpv4HttpsAgent, preferIpv4Resolution } from './ipv4-network.util';

describe('The IPv4 network utilities', () => {
  describe('The createIpv4HttpsAgent() function', () => {
    it('should create an IPv4-only agent that never reuses a connection, with bounded sockets', () => {
      const agent = createIpv4HttpsAgent(7) as unknown as { keepAlive: boolean; maxSockets: number; options: { family?: number } };

      expect(agent.options.family).toBe(4);
      expect(agent.keepAlive).toBe(false);
      expect(agent.maxSockets).toBe(7);
    });
  });

  describe('The preferIpv4Resolution() function', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should make DNS return IPv4 addresses first', () => {
      const setDefaultResultOrderSpy = jest.spyOn(dns, 'setDefaultResultOrder').mockImplementation(() => undefined);

      preferIpv4Resolution();

      expect(setDefaultResultOrderSpy).toHaveBeenCalledWith('ipv4first');
    });
  });
});
