import { Injectable } from '@nestjs/common';

@Injectable()
export class ChargePortLatchTrackerService {
  private readonly WINDOW_MS = 5000;
  private readonly CLEANUP_MS = 15000;

  private recentEvents = new Map<string, number[]>();

  trackLatchEvent(vin: string, timestamp: number): void {
    const events = this.recentEvents.get(vin) || [];
    events.push(timestamp);

    this.recentEvents.set(vin, events.filter(t => timestamp - t < this.CLEANUP_MS));
  }

  hasLatchEventAround(vin: string, eventTimestamp: number): boolean {
    const events = this.recentEvents.get(vin) || [];

    const hasEvent = events.some(t => Math.abs(eventTimestamp - t) <= this.WINDOW_MS);

    const now = Date.now();
    this.recentEvents.set(vin, events.filter(t => now - t < this.CLEANUP_MS));

    return hasEvent;
  }
}
