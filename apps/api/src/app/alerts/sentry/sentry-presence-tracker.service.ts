import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SentryPresenceTrackerService {
  private readonly logger = new Logger(SentryPresenceTrackerService.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly counts = new Map<string, number>();
  private readonly capped = new Set<string>();
  private readonly thresholdMs = parseInt(process.env.SENTRY_SUSTAINED_AWARE_SECONDS ?? '15', 10) * 1000;
  private readonly maxRepeats = parseInt(process.env.SENTRY_SUSTAINED_MAX_REPEATS ?? '3', 10);

  public watch(vin: string, onSustained: (isFinal: boolean) => void): void {
    if (this.timers.has(vin) || this.capped.has(vin)) {
      return;
    }

    this.logger.log(`[SENTRY_PRESENCE] Watching VIN ${vin} - re-alerting every ${this.thresholdMs / 1000}s (max ${this.maxRepeats})`);
    this.counts.set(vin, 0);

    const timer = setInterval(() => {
      const count = (this.counts.get(vin) ?? 0) + 1;
      this.counts.set(vin, count);
      const isFinal = count >= this.maxRepeats;
      this.logger.warn(`[SENTRY_PRESENCE] VIN ${vin} still Aware - dispatching (${count}/${this.maxRepeats})`);
      onSustained(isFinal);

      if (isFinal) {
        this.stopAtCap(vin);
      }
    }, this.thresholdMs);

    this.timers.set(vin, timer);
  }

  public clear(vin: string): void {
    this.stopTimer(vin);
    this.capped.delete(vin);
  }

  private stopAtCap(vin: string): void {
    this.logger.warn(`[SENTRY_PRESENCE] VIN ${vin} reached ${this.maxRepeats} sustained alerts - stopping until it leaves Aware`);
    this.stopTimer(vin);
    this.capped.add(vin);
  }

  private stopTimer(vin: string): void {
    const timer = this.timers.get(vin);

    if (timer) {
      clearInterval(timer);
      this.timers.delete(vin);
    }

    this.counts.delete(vin);
  }
}
