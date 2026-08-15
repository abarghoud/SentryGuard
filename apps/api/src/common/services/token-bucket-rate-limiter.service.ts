import { Injectable } from '@nestjs/common';

type Clock = () => number;
type Sleeper = (milliseconds: number) => Promise<void>;

@Injectable()
export class TokenBucketRateLimiterService {
  private tokens: number;
  private lastRefillTimestamp: number;

  constructor(
    private readonly ratePerSecond: number,
    private readonly clock: Clock = Date.now,
    private readonly sleeper: Sleeper = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds))
  ) {
    this.tokens = ratePerSecond;
    this.lastRefillTimestamp = clock();
  }

  public async acquire(): Promise<void> {
    while (!this.tryConsumeToken()) {
      await this.sleeper(this.calculateWaitMilliseconds());
    }
  }

  private tryConsumeToken(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = this.clock();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;

    this.tokens = Math.min(
      this.ratePerSecond,
      this.tokens + elapsedSeconds * this.ratePerSecond
    );
    this.lastRefillTimestamp = now;
  }

  private calculateWaitMilliseconds(): number {
    const missingTokens = 1 - this.tokens;
    return Math.ceil((missingTokens / this.ratePerSecond) * 1000);
  }
}
