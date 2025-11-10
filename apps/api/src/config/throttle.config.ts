/**
 * Rate Limiting Configuration
 *
 * Centralized configuration for API rate limiting thresholds.
 * All values are in requests per minute (req/min) with a 60-second TTL window.
 *
 * These limits can be overridden via environment variables:
 * - THROTTLE_TTL: Time window in milliseconds (default: 60000ms)
 * - THROTTLE_LIMIT: Global default limit (default: 100 req/min)
 */

export const THROTTLE_LIMIT_AUTHENTICATED_READ = 200;
export const THROTTLE_LIMIT_AUTHENTICATED_WRITE = 100;
export const THROTTLE_LIMIT_CRITICAL = 50;
export const THROTTLE_LIMIT_TEST = 30;
export const THROTTLE_LIMIT_DEFAULT = 100;
export const THROTTLE_LIMIT_PUBLIC_SENSITIVE = 40;
export const THROTTLE_TTL = 60000;

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
