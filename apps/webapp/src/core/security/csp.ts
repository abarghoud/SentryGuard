export const LOCALE_ROUTES = [
  '/',
  '/faq',
  '/supporters',
  '/en',
  '/fr',
  '/en/faq',
  '/fr/faq',
  '/en/supporters',
  '/fr/supporters',
];

export function isLocaleRoute(pathname: string): boolean {
  return LOCALE_ROUTES.includes(pathname);
}

export function buildCspHeader(apiUrl: string, isProduction: boolean): string {
  const unsafeEval = isProduction ? '' : " 'unsafe-eval'";

  return `default-src 'self'; script-src 'self'${unsafeEval} 'unsafe-inline' https://cdnjs.buymeacoffee.com https://client.crisp.chat; style-src 'self' 'unsafe-inline' https://client.crisp.chat; img-src 'self' data: blob: https://img.buymeacoffee.com https://cdn.buymeacoffee.com https://client.crisp.chat https://image.crisp.chat; connect-src 'self' ${apiUrl} https://api.tesla.com https://api.rollbar.com https://client.crisp.chat wss://client.relay.crisp.chat wss://stream.relay.crisp.chat; worker-src 'self' blob:; frame-src 'self' https://*.crisp.help https://www.buymeacoffee.com https://buymeacoffee.com; font-src 'self' https://client.crisp.chat; frame-ancestors 'none';`;
}
