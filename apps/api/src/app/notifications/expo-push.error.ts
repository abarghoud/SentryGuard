export class ExpoPushError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryAfterMs?: number,
    public readonly isDeviceNotRegistered = false
  ) {
    super(message);
    this.name = 'ExpoPushError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
