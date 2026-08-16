import { Injectable } from '@nestjs/common';

export enum BreakInTrackedEvent {
  ChargePortLatchDisengaged = 'ChargePortLatchDisengaged',
  DoorOpened = 'DoorOpened',
}

const EVENT_TRACKING_CONFIG: Record<BreakInTrackedEvent, { windowMs: number; cleanupMs: number }> = {
  [BreakInTrackedEvent.ChargePortLatchDisengaged]: { windowMs: 5000, cleanupMs: 15000 },
  [BreakInTrackedEvent.DoorOpened]: { windowMs: 4000, cleanupMs: 12000 },
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

    const now = Date.now();
    this.setEvents(vin, event, events.filter(t => now - t < cleanupMs));

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
}
