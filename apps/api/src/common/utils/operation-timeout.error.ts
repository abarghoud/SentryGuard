export class OperationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperationTimeoutError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
