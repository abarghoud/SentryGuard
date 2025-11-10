/**
 * Rate Limiting Configuration
 *
 * Centralized configuration for API rate limiting thresholds.
 * All values are in requests per minute (req/min) with a 60-second TTL window.
 *
 * All limits can be overridden via environment variables:
 * - THROTTLE_TTL: Time window in milliseconds
 * - THROTTLE_LIMIT_DEFAULT: Global default limit
 * - THROTTLE_LIMIT_PUBLIC_SENSITIVE: Sensitive public endpoints (OAuth)
 * - THROTTLE_LIMIT_AUTHENTICATED_READ: Authenticated read endpoints
 * - THROTTLE_LIMIT_AUTHENTICATED_WRITE: Authenticated write endpoints
 * - THROTTLE_LIMIT_CRITICAL: Critical/intensive endpoints
 * - THROTTLE_LIMIT_TEST: Test/system check endpoints
 */

const DEFAULT_THROTTLE_TTL = 60000;
const DEFAULT_THROTTLE_LIMIT_DEFAULT = 100;
const DEFAULT_THROTTLE_LIMIT_PUBLIC_SENSITIVE = 40;
const DEFAULT_THROTTLE_LIMIT_AUTHENTICATED_READ = 200;
const DEFAULT_THROTTLE_LIMIT_AUTHENTICATED_WRITE = 100;
const DEFAULT_THROTTLE_LIMIT_CRITICAL = 50;
const DEFAULT_THROTTLE_LIMIT_TEST = 30;

const THROTTLE_TTL = parseInt(process.env.THROTTLE_TTL ?? String(DEFAULT_THROTTLE_TTL), 10);
const THROTTLE_LIMIT_DEFAULT = parseInt(process.env.THROTTLE_LIMIT_DEFAULT ?? String(DEFAULT_THROTTLE_LIMIT_DEFAULT), 10);
const THROTTLE_LIMIT_PUBLIC_SENSITIVE = parseInt(process.env.THROTTLE_LIMIT_PUBLIC_SENSITIVE ?? String(DEFAULT_THROTTLE_LIMIT_PUBLIC_SENSITIVE), 10);
const THROTTLE_LIMIT_AUTHENTICATED_READ = parseInt(process.env.THROTTLE_LIMIT_AUTHENTICATED_READ ?? String(DEFAULT_THROTTLE_LIMIT_AUTHENTICATED_READ), 10);
const THROTTLE_LIMIT_AUTHENTICATED_WRITE = parseInt(process.env.THROTTLE_LIMIT_AUTHENTICATED_WRITE ?? String(DEFAULT_THROTTLE_LIMIT_AUTHENTICATED_WRITE), 10);
const THROTTLE_LIMIT_CRITICAL = parseInt(process.env.THROTTLE_LIMIT_CRITICAL ?? String(DEFAULT_THROTTLE_LIMIT_CRITICAL), 10);
const THROTTLE_LIMIT_TEST = parseInt(process.env.THROTTLE_LIMIT_TEST ?? String(DEFAULT_THROTTLE_LIMIT_TEST), 10);

export function getThrottleConfig() {
  return {
    ttl: THROTTLE_TTL,
    limit: THROTTLE_LIMIT_DEFAULT,
  };
}

export const ThrottleOptions = {
  authenticatedRead: () => ({
    default: {
      limit: THROTTLE_LIMIT_AUTHENTICATED_READ,
      ttl: THROTTLE_TTL,
    },
  }),
  authenticatedWrite: () => ({
    default: {
      limit: THROTTLE_LIMIT_AUTHENTICATED_WRITE,
      ttl: THROTTLE_TTL,
    },
  }),
  critical: () => ({
    default: {
      limit: THROTTLE_LIMIT_CRITICAL,
      ttl: THROTTLE_TTL,
    },
  }),
  test: () => ({
    default: {
      limit: THROTTLE_LIMIT_TEST,
      ttl: THROTTLE_TTL,
    },
  }),
  default: () => ({
    default: {
      limit: THROTTLE_LIMIT_DEFAULT,
      ttl: THROTTLE_TTL,
    },
  }),
  publicSensitive: () => ({
    default: {
      limit: THROTTLE_LIMIT_PUBLIC_SENSITIVE,
      ttl: THROTTLE_TTL,
    },
  }),
};
