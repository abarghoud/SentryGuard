import { withTimeout } from './with-timeout.util';

describe('The withTimeout() function', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should resolve when the operation completes before the timeout', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    await expect(withTimeout(operation, 1000, 'request timed out')).resolves.toBe('success');
  });

  it('should abort the operation and reject when the timeout is reached', async () => {
    let wasAborted = false;
    const operation = jest.fn((signal: AbortSignal) => new Promise<string>((_, reject) => {
      signal.addEventListener('abort', () => {
        wasAborted = true;
        reject(new Error('aborted'));
      });
    }));

    const result = withTimeout(operation, 1000, 'request timed out');
    const rejection = expect(result).rejects.toThrow('ETIMEDOUT: request timed out');
    await jest.advanceTimersByTimeAsync(1000);

    await rejection;
    expect(wasAborted).toBe(true);
  });
});
