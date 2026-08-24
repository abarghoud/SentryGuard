const DEFAULT_NOTIFICATION_REQUEST_TIMEOUT_MS = 10_000;

function resolvePositiveInt(envName: string, defaultValue: number): number {
  const parsed = parseInt(process.env[envName] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export const NOTIFICATION_REQUEST_TIMEOUT_MS = resolvePositiveInt(
  'NOTIFICATION_REQUEST_TIMEOUT_MS',
  DEFAULT_NOTIFICATION_REQUEST_TIMEOUT_MS
);
