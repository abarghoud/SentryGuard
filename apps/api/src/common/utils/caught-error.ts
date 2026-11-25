import { OperationTimeoutError } from './with-timeout.util';

const TRANSIENT_NETWORK_ERROR_CODES = new Set([
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);

const MAX_NESTING_DEPTH = 2;
const MAX_REASON_LENGTH = 60;
const BOT_TOKEN_PATTERN = /bot\d+:[A-Za-z0-9_-]+/g;

interface ErrorLike {
  cause?: unknown;
  code?: unknown;
  description?: unknown;
  errno?: unknown;
  errors?: unknown;
  message?: unknown;
  name?: unknown;
  parameters?: { retry_after?: unknown };
  status?: unknown;
  type?: unknown;
}

const redact = (text: string): string => text.replace(BOT_TOKEN_PATTERN, 'bot<redacted>');

export class CaughtError {
  private readonly errorLike: ErrorLike | null;

  public constructor(private readonly error: unknown) {
    this.errorLike = typeof error === 'object' && error !== null ? (error as ErrorLike) : null;
  }

  public codes(): string[] {
    return [...new Set(this.codesAtDepth(0))];
  }

  public isTransientNetwork(): boolean {
    if (this.error instanceof OperationTimeoutError) {
      return false;
    }

    return this.isAggregate() || this.codes().some((code) => TRANSIENT_NETWORK_ERROR_CODES.has(code));
  }

  public retryAfterMs(): number | null {
    const retryAfterSeconds = this.errorLike?.parameters?.retry_after;
    return typeof retryAfterSeconds === 'number' && retryAfterSeconds >= 0 ? retryAfterSeconds * 1000 : null;
  }

  public describe(): string {
    return redact(this.describeAtDepth(0));
  }

  public summarizeReason(): string {
    if (this.error instanceof OperationTimeoutError) {
      return 'timeout';
    }

    if (!this.errorLike) {
      return redact(String(this.error)).slice(0, MAX_REASON_LENGTH);
    }

    return this.findNumericStatus(this.errorLike) ?? (this.codes()[0] || this.truncateMessage(this.errorLike));
  }

  private nestedErrors(): unknown[] {
    const errors = this.errorLike?.errors;
    return Array.isArray(errors) ? errors : [];
  }

  private isAggregate(): boolean {
    return this.errorLike !== null && (this.errorLike.name === 'AggregateError' || this.nestedErrors().length > 0);
  }

  private codesAtDepth(depth: number): string[] {
    if (!this.errorLike || depth > MAX_NESTING_DEPTH) {
      return [];
    }

    const ownCodes = [this.errorLike.code, this.errorLike.errno].filter((code): code is string => typeof code === 'string');
    const nestedCodes = [this.errorLike.cause, ...this.nestedErrors()].flatMap((nested) => new CaughtError(nested).codesAtDepth(depth + 1));
    return [...ownCodes, ...nestedCodes];
  }

  private describeAtDepth(depth: number): string {
    if (!this.errorLike) {
      return String(this.error);
    }

    const name = typeof this.errorLike.name === 'string' ? this.errorLike.name : 'Error';
    const message = typeof this.errorLike.message === 'string' && this.errorLike.message.length > 0 ? this.errorLike.message : '<empty message>';
    const fields = [...this.describeFields(this.errorLike), ...(depth < MAX_NESTING_DEPTH ? this.describeNestedFields(this.errorLike, depth) : [])];
    return `${name}: ${message}${fields.length > 0 ? ` (${fields.join(', ')})` : ''}`;
  }

  private describeFields(errorLike: ErrorLike): string[] {
    const scalarFields = (['code', 'errno', 'type', 'status'] as const)
      .filter((key) => errorLike[key] !== undefined && errorLike[key] !== null && errorLike[key] !== '')
      .map((key) => `${key}=${String(errorLike[key])}`);
    const description = typeof errorLike.description === 'string' && errorLike.description.length > 0 ? [`description="${errorLike.description}"`] : [];
    const retryAfter = errorLike.parameters?.retry_after !== undefined ? [`retry_after=${String(errorLike.parameters.retry_after)}`] : [];

    return [...scalarFields, ...description, ...retryAfter];
  }

  private describeNestedFields(errorLike: ErrorLike, depth: number): string[] {
    const nested = this.nestedErrors();
    const cause = errorLike.cause !== undefined ? [`cause=[${new CaughtError(errorLike.cause).describeAtDepth(depth + 1)}]`] : [];
    const errors = nested.length > 0 ? [`errors=[${nested.map((nestedError) => new CaughtError(nestedError).describeAtDepth(depth + 1)).join('; ')}]`] : [];

    return [...cause, ...errors];
  }

  private findNumericStatus(errorLike: ErrorLike): string | undefined {
    const status = [errorLike.status, errorLike.code].find((value) => typeof value === 'number');
    return status === undefined ? undefined : String(status);
  }

  private truncateMessage(errorLike: ErrorLike): string {
    const message = typeof errorLike.message === 'string' && errorLike.message.length > 0 ? errorLike.message : String(errorLike.name ?? 'unknown');
    return redact(message).slice(0, MAX_REASON_LENGTH);
  }
}
