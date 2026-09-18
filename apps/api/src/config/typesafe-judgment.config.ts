const DEFAULT_ALERT_JUDGMENT_TIMEOUT_MS = 2_000;
const DEFAULT_INGESTION_JUDGMENT_TIMEOUT_MS = 10_000;

function resolvePositiveInt(envName: string, defaultValue: number): number {
  const parsed = parseInt(process.env[envName] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export const ALERT_JUDGMENT_REQUEST_OPTIONS = {
  timeout: resolvePositiveInt('TYPESAFE_ALERT_JUDGMENT_TIMEOUT_MS', DEFAULT_ALERT_JUDGMENT_TIMEOUT_MS),
  retry: { maxRetries: 0 },
};

export const INGESTION_JUDGMENT_REQUEST_OPTIONS = {
  timeout: resolvePositiveInt('TYPESAFE_INGESTION_JUDGMENT_TIMEOUT_MS', DEFAULT_INGESTION_JUDGMENT_TIMEOUT_MS),
  retry: { maxRetries: 1 },
};
