import * as https from 'https';
import {
  createTeslaProxyHttpsAgent,
  resolveTeslaProxyBaseUrl,
  validateTeslaProxyConfiguration,
} from './tesla-proxy-agent.util';

const fakeBaseUrl = 'https://10.0.0.185:4443';
const fakeCaCertificate = '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----\n';
const fakeCaCertificateBase64 = Buffer.from(fakeCaCertificate, 'utf-8').toString('base64');

const agentOptionsOf = (agent: https.Agent): https.AgentOptions =>
  (agent as unknown as { options: https.AgentOptions }).options;

describe('The tesla-proxy-agent util', () => {
  let initialEnvironment: NodeJS.ProcessEnv;

  beforeEach(() => {
    initialEnvironment = { ...process.env };
    delete process.env.TESLA_API_BASE_URL;
    delete process.env.TESLA_PROXY_CA_CERT_BASE64;
    delete process.env.TESLA_PROXY_TLS_SERVERNAME;
  });

  afterEach(() => {
    process.env = initialEnvironment;
  });

  describe('The resolveTeslaProxyBaseUrl() function', () => {
    describe('When TESLA_API_BASE_URL is defined', () => {
      it('should return it', () => {
        process.env.TESLA_API_BASE_URL = fakeBaseUrl;

        expect(resolveTeslaProxyBaseUrl()).toBe(fakeBaseUrl);
      });
    });

    describe('When TESLA_API_BASE_URL is missing', () => {
      it('should throw', () => {
        expect(resolveTeslaProxyBaseUrl).toThrow('TESLA_API_BASE_URL must be defined');
      });
    });
  });

  describe('The createTeslaProxyHttpsAgent() function', () => {
    describe('When the CA certificate is provided', () => {
      let agent: https.Agent;

      beforeEach(() => {
        process.env.TESLA_PROXY_CA_CERT_BASE64 = fakeCaCertificateBase64;

        agent = createTeslaProxyHttpsAgent();
      });

      it('should enable certificate verification', () => {
        expect(agentOptionsOf(agent).rejectUnauthorized).toBe(true);
      });

      it('should decode the CA certificate', () => {
        expect(agentOptionsOf(agent).ca).toBe(fakeCaCertificate);
      });

      it('should leave hostname verification to Node', () => {
        expect(agentOptionsOf(agent).checkServerIdentity).toBeUndefined();
      });
    });

    describe('When a TLS servername override is provided', () => {
      it('should verify the certificate against that name', () => {
        process.env.TESLA_PROXY_CA_CERT_BASE64 = fakeCaCertificateBase64;
        process.env.TESLA_PROXY_TLS_SERVERNAME = 'vehicle-command.example.org';

        const agent = createTeslaProxyHttpsAgent();

        expect(agentOptionsOf(agent).servername).toBe('vehicle-command.example.org');
      });
    });

    describe('When the CA certificate is missing', () => {
      it('should throw instead of falling back to an unverified agent', () => {
        expect(createTeslaProxyHttpsAgent).toThrow(
          'TESLA_PROXY_CA_CERT_BASE64 must be defined'
        );
      });
    });

    describe('When the CA certificate is missing outside production', () => {
      it('should throw just the same', () => {
        process.env.NODE_ENV = 'development';

        expect(createTeslaProxyHttpsAgent).toThrow(
          'TESLA_PROXY_CA_CERT_BASE64 must be defined'
        );
      });
    });
  });

  describe('The validateTeslaProxyConfiguration() function', () => {
    describe('When every variable is valid', () => {
      it('should not throw', () => {
        process.env.TESLA_API_BASE_URL = fakeBaseUrl;
        process.env.TESLA_PROXY_CA_CERT_BASE64 = fakeCaCertificateBase64;

        expect(validateTeslaProxyConfiguration).not.toThrow();
      });
    });

    describe('When the CA certificate is missing', () => {
      it('should throw', () => {
        process.env.TESLA_API_BASE_URL = fakeBaseUrl;

        expect(validateTeslaProxyConfiguration).toThrow(
          'TESLA_PROXY_CA_CERT_BASE64 must be defined'
        );
      });
    });
  });
});
