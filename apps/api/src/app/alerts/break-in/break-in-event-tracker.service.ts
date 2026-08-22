import { Injectable } from '@nestjs/common';

export enum BreakInTrackedEvent {
  ChargePortLatchDisengaged = 'ChargePortLatchDisengaged',
  CenterDisplayOwnerActivity = 'CenterDisplayOwnerActivity',
}

const EVENT_TRACKING_CONFIG: Record<BreakInTrackedEvent, { windowMs: number; cleanupMs: number }> = {
  [BreakInTrackedEvent.ChargePortLatchDisengaged]: { windowMs: 5000, cleanupMs: 15000 },
  [BreakInTrackedEvent.CenterDisplayOwnerActivity]: { windowMs: 5000, cleanupMs: 15000 },
};

@Injectable()
export class BreakInEventTrackerService {
  private recentEvents = new Map<string, Map<BreakInTrackedEvent, number[]>>();

  public track(vin: string, event: BreakInTrackedEvent, timestamp: number): void {
    const { cleanupMs } = EVENT_TRACKING_CONFIG[event];
    const events = this.getEvents(vin, event);

    events.push(timestamp);
    this.setEvents(vin, event, events.filter(t => timestamp - t < cleanupMs));
  }

  public hasEventAround(vin: string, event: BreakInTrackedEvent, eventTimestamp: number): boolean {
    const { windowMs, cleanupMs } = EVENT_TRACKING_CONFIG[event];
    const events = this.getEvents(vin, event);

    const hasEvent = events.some(t => Math.abs(eventTimestamp - t) <= windowMs);

    this.cleanup(vin, event, events, cleanupMs);

    return hasEvent;
  }

  public hasEventAfter(vin: string, event: BreakInTrackedEvent, eventTimestamp: number): boolean {
    const { windowMs, cleanupMs } = EVENT_TRACKING_CONFIG[event];
    const events = this.getEvents(vin, event);

    const hasEvent = events.some(t => t >= eventTimestamp && t - eventTimestamp <= windowMs);

    this.cleanup(vin, event, events, cleanupMs);

    return hasEvent;
  }

  private getEvents(vin: string, event: BreakInTrackedEvent): number[] {
    return this.recentEvents.get(vin)?.get(event) || [];
  }

  private setEvents(vin: string, event: BreakInTrackedEvent, events: number[]): void {
    const vinEvents = this.recentEvents.get(vin) || new Map<BreakInTrackedEvent, number[]>();
    vinEvents.set(event, events);
    this.recentEvents.set(vin, vinEvents);
  }

  private cleanup(vin: string, event: BreakInTrackedEvent, events: number[], cleanupMs: number): void {
    const now = Date.now();
    this.setEvents(vin, event, events.filter(t => now - t < cleanupMs));
  }
}
