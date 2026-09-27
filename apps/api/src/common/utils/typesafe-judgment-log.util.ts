import { Logger } from '@nestjs/common';

interface JudgmentOutcome {
  path: string;
  outcome: string;
  accepted: boolean;
  durationMs: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  scores?: Record<string, number>;
}

const judgmentLogger = new Logger('TypeSafeJudgment');

export function logJudgment(outcome: JudgmentOutcome): void {
  judgmentLogger.log(`[TYPESAFE_JUDGMENT] ${JSON.stringify(outcome)}`);
}

export function logJudgmentFailure(path: string, durationMs: number, error: unknown): void {
  judgmentLogger.warn(
    `[TYPESAFE_JUDGMENT_FAILED] ${JSON.stringify({ path, durationMs, error: String(error) })}`
  );
}
