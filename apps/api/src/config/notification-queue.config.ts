const DEFAULT_NOTIFICATION_QUEUE_SIZE = 10_000;
const DEFAULT_NOTIFICATION_WORKER_COUNT = 5;
const DEFAULT_TELEGRAM_NOTIFICATION_RATE_LIMIT_PER_SECOND = 20;

function resolvePositiveInt(envName: string, defaultValue: number): number {
  const parsed = parseInt(process.env[envName] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export const NOTIFICATION_QUEUE_SIZE = resolvePositiveInt(
  'NOTIFICATION_QUEUE_SIZE',
  DEFAULT_NOTIFICATION_QUEUE_SIZE
);

export const NOTIFICATION_WORKER_COUNT = resolvePositiveInt(
  'NOTIFICATION_WORKER_COUNT',
  DEFAULT_NOTIFICATION_WORKER_COUNT
);

export const TELEGRAM_NOTIFICATION_RATE_LIMIT_PER_SECOND = resolvePositiveInt(
  'TELEGRAM_NOTIFICATION_RATE_LIMIT_PER_SECOND',
  DEFAULT_TELEGRAM_NOTIFICATION_RATE_LIMIT_PER_SECOND
);
