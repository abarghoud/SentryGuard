import * as dns from 'dns';
import * as https from 'https';

export function createIpv4HttpsAgent(maxSockets: number): https.Agent {
  return new https.Agent({ family: 4, keepAlive: false, maxSockets });
}

export function preferIpv4Resolution(): void {
  dns.setDefaultResultOrder('ipv4first');
}
