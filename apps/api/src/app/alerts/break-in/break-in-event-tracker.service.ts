import { Injectable } from '@nestjs/common';

export enum BreakInTrackedEvent {
  CenterDisplayLock = 'CenterDisplayLock',
  CenterDisplayOwnerActivity = 'CenterDisplayOwnerActivity',
  ChargePortLatchDisengaged = 'ChargePortLatchDisengaged',
}

export interface BreakInTrackingResult {
  isAlreadyTracked: boolean;
}

export interface BreakInTrigger {
  burstStartTime: number;
  lockTime: number;
}

interface TrackedEvent {
  receivedAt: number;
  vehicleTime: number;
}

const EVENT_PROXIMITY_WINDOW_MS = 5_000;
const REPEATED_PULLS_WINDOW_MS = 60_000;
const RETENTION_MS = 180_000;

@Injectable()
export class BreakInEventTrackerService {
  private readonly histories = new Map<string, Map<BreakInTrackedEvent, TrackedEvent[]>>();

  public track(vin: string, event: BreakInTrackedEvent, vehicleTime: number): BreakInTrackingResult {
    const recentEvents = this.findRecentEvents(vin, event);
    const isAlreadyTracked = recentEvents.some(trackedEvent => trackedEvent.vehicleTime === vehicleTime);

    if (!isAlreadyTracked) {
      this.saveEvents(vin, event, [...recentEvents, { receivedAt: Date.now(), vehicleTime }]);
    }

    return { isAlreadyTracked };
  }

  public hasEventAround(vin: string, event: BreakInTrackedEvent, timestamp: number): boolean {
    return this.getVehicleTimes(vin, event).some(vehicleTime => {
      const distanceMs = Math.abs(timestamp - vehicleTime);

      return distanceMs <= EVENT_PROXIMITY_WINDOW_MS;
    });
  }

  public hasEventSince(vin: string, event: BreakInTrackedEvent, timestamp: number): boolean {
    return this.getVehicleTimes(vin, event).some(vehicleTime => vehicleTime >= timestamp);
  }

  public findRepeatedPullTrigger(vin: string, lockTime: number): BreakInTrigger | null {
    const earlierPullTimes = this.findEarlierPullTimesInBurst(vin, lockTime);
    const isSecondPull = earlierPullTimes.length === 1;

    if (!isSecondPull) {
      return null;
    }

    return { burstStartTime: earlierPullTimes[0], lockTime };
  }

  private findEarlierPullTimesInBurst(vin: string, lockTime: number): number[] {
    const burstWindowStart = lockTime - REPEATED_PULLS_WINDOW_MS;
    const lastOwnerActivityTime = this.findLastOwnerActivityBefore(vin, lockTime);

    return this.getVehicleTimes(vin, BreakInTrackedEvent.CenterDisplayLock).filter(pullTime => {
      const isBeforeThisPull = pullTime < lockTime;
      const isWithinBurstWindow = pullTime >= burstWindowStart;
      const isAfterLastOwnerActivity = lastOwnerActivityTime === null || pullTime > lastOwnerActivityTime;

      return isBeforeThisPull && isWithinBurstWindow && isAfterLastOwnerActivity && this.isHandlePull(vin, pullTime);
    });
  }

  private isHandlePull(vin: string, pullTime: number): boolean {
    return !this.hasEventAround(vin, BreakInTrackedEvent.ChargePortLatchDisengaged, pullTime);
  }

  private findLastOwnerActivityBefore(vin: string, timestamp: number): number | null {
    const earlierActivityTimes = this.getVehicleTimes(vin, BreakInTrackedEvent.CenterDisplayOwnerActivity)
      .filter(activityTime => activityTime < timestamp);

    if (earlierActivityTimes.length === 0) {
      return null;
    }

    return Math.max(...earlierActivityTimes);
  }

  private getVehicleTimes(vin: string, event: BreakInTrackedEvent): number[] {
    return this.findRecentEvents(vin, event).map(trackedEvent => trackedEvent.vehicleTime);
  }

  private findRecentEvents(vin: string, event: BreakInTrackedEvent): TrackedEvent[] {
    const trackedEvents = this.histories.get(vin)?.get(event) ?? [];
    const oldestKeptReceivedAt = Date.now() - RETENTION_MS;

    return trackedEvents.filter(trackedEvent => trackedEvent.receivedAt >= oldestKeptReceivedAt);
  }

  private saveEvents(vin: string, event: BreakInTrackedEvent, events: TrackedEvent[]): void {
    const history = this.histories.get(vin) ?? new Map<BreakInTrackedEvent, TrackedEvent[]>();

    history.set(event, events);
    this.histories.set(vin, history);
  }
}
