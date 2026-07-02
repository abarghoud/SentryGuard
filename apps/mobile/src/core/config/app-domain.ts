/**
 * Normalizes a user-provided value into a bare domain (host[:port]).
 *
 * Accepts:
 *  - a bare domain:                "mydomain.com"
 *  - a URL with scheme:           "http://mydomain.com" / "https://mydomain.com/path"
 *  - a legacy Tesla pairing URL:  "https://tesla.com/_ak/mydomain.com" (backward compatible)
 */
export function normalizeDomain(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    return '';
  }

  const pairingMatch = trimmed.match(/_ak\/([^/?#]+)/i);
  if (pairingMatch) {
    return pairingMatch[1];
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).host;
    } catch {
      return '';
    }
  }

  return trimmed.replace(/^\/+/, '').split(/[/?#]/)[0];
}

export function buildTeslaPairingUrl(domain: string): string {
  return domain ? `https://tesla.com/_ak/${domain}` : '';
}

export function buildAppUrl(domain: string, path: string): string {
  if (!domain) {
    return '';
  }

  return `https://${domain}${path.startsWith('/') ? path : `/${path}`}`;
}
