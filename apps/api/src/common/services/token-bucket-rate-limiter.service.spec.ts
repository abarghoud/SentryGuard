import { TokenBucketRateLimiterService } from './token-bucket-rate-limiter.service';

describe('The TokenBucketRateLimiterService class', () => {
  describe('The acquire() method', () => {
    it('should allow the initial burst without waiting', async () => {
      const sleepDurations: number[] = [];
      const limiter = new TokenBucketRateLimiterService(2, () => 0, async (ms) => {
        sleepDurations.push(ms);
      });

      await limiter.acquire();
      await limiter.acquire();

      expect(sleepDurations).toHaveLength(0);
    });

    it('should wait for the next token when the bucket is empty', async () => {
      let now = 0;
      const sleepDurations: number[] = [];
      const limiter = new TokenBucketRateLimiterService(2, () => now, async (ms) => {
        sleepDurations.push(ms);
        now += ms;
      });

      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      expect(sleepDurations).toStrictEqual([500]);
    });

    it('should refill tokens as time elapses', async () => {
      let now = 0;
      const sleepDurations: number[] = [];
      const limiter = new TokenBucketRateLimiterService(2, () => now, async (ms) => {
        sleepDurations.push(ms);
        now += ms;
      });

      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      expect(sleepDurations).toStrictEqual([500]);
      expect(now).toBe(500);

      await limiter.acquire();
      await limiter.acquire();

      expect(sleepDurations).toHaveLength(3);
    });

    it('should never exceed the bucket capacity', async () => {
      let now = 0;
      const sleepDurations: number[] = [];
      const limiter = new TokenBucketRateLimiterService(2, () => now, async (ms) => {
        sleepDurations.push(ms);
        now += ms;
      });

      await limiter.acquire();
      now += 10_000;

      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      expect(sleepDurations).toStrictEqual([500]);
    });
  });
});
