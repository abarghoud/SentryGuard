import * as https from 'https';

const TESLA_PROXY_BASE_URL_VARIABLE = 'TESLA_API_BASE_URL';
const TESLA_PROXY_CA_CERT_VARIABLE = 'TESLA_PROXY_CA_CERT_BASE64';
const TESLA_PROXY_SERVERNAME_VARIABLE = 'TESLA_PROXY_TLS_SERVERNAME';

const SELF_HOSTING_GUIDE_URL =
  'https://github.com/abarghoud/SentryGuard/blob/main/SELF_HOSTING.md#76-pinning-the-vehicle-command-hop';

const MISSING_CA_CERT_ERROR = [
  `${TESLA_PROXY_CA_CERT_VARIABLE} must be defined (new required variable).`,
  '',
  'The API now verifies the TLS certificate of the Tesla vehicle-command proxy.',
  'That hop carries your decrypted Tesla access tokens and used to accept any',
  'certificate from any host, so this variable is required and has no fallback.',
  '',
  'Upgrading an existing install? Add it to your .env before starting:',
  "  Let's Encrypt  cat /etc/ssl/certs/ISRG_Root_X1.pem /etc/ssl/certs/ISRG_Root_X2.pem | base64 -w 0",
  '  Own CA         base64 -w 0 fleet-telemetry/certs/ca.crt',
  '',
  'It must be a self-signed ROOT. Do not use chain.pem: it is an intermediate,',
  'which fails with UNABLE_TO_GET_ISSUER_CERT.',
  '',
  `Guide: ${SELF_HOSTING_GUIDE_URL}`,
].join('\n');

const MISSING_BASE_URL_ERROR = [
  `${TESLA_PROXY_BASE_URL_VARIABLE} must be defined (no longer has a default).`,
  '',
  'It is the base URL of the Tesla vehicle-command proxy. The compiled-in default',
  'pointed at a host that matched no real deployment, so it is now required.',
  '',
  `Guide: ${SELF_HOSTING_GUIDE_URL}`,
].join('\n');

const readBaseUrl = (): string => {
  const baseUrl = process.env[TESLA_PROXY_BASE_URL_VARIABLE];

  if (!baseUrl) {
    throw new Error(MISSING_BASE_URL_ERROR);
  }

  return baseUrl;
};

const readCaCertificateBase64 = (): string => {
  const caCertBase64 = process.env[TESLA_PROXY_CA_CERT_VARIABLE];

  if (!caCertBase64) {
    throw new Error(MISSING_CA_CERT_ERROR);
  }

  return caCertBase64;
};

const buildIdentityOptions = (): https.AgentOptions => {
  const servername = process.env[TESLA_PROXY_SERVERNAME_VARIABLE];

  return servername ? { servername } : {};
};

export const resolveTeslaProxyBaseUrl = (): string => readBaseUrl();

export const createTeslaProxyHttpsAgent = (): https.Agent =>
  new https.Agent({
    ca: Buffer.from(readCaCertificateBase64(), 'base64').toString('utf-8'),
    rejectUnauthorized: true,
    ...buildIdentityOptions(),
  });

export const validateTeslaProxyConfiguration = (): void => {
  readBaseUrl();
  readCaCertificateBase64();
};
