import { Injectable } from '@nestjs/common';

import { isVehicleTimeTooFarAhead } from '../../common/utils/vehicle-clock.util';
import { TelemetryEventHandler } from '../telemetry/interfaces/telemetry-event-handler.interface';
import { SentryModeState, TelemetryMessage } from '../telemetry/models/telemetry-message.model';

interface SentryModeObservation {
  receivedAt: number;
  state: SentryModeState;
  vehicleTime: number;
}

const OBSERVATION_MAX_AGE_MS = 3_600_000;
const INACTIVE_STATES = new Set([SentryModeState.Off, SentryModeState.Unknown]);

const byVehicleTime = (first: SentryModeObservation, second: SentryModeObservation): number => first.vehicleTime - second.vehicleTime;

@Injectable()
export class SentryModeStateTrackerService implements TelemetryEventHandler {
  private readonly histories = new Map<string, SentryModeObservation[]>();

  public async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    const state = telemetryMessage.getSentryModeState();
    const vehicleTime = new Date(telemetryMessage.createdAt).getTime();

    if (state === null || isNaN(vehicleTime) || isVehicleTimeTooFarAhead(vehicleTime)) {
      return;
    }

    this.observe(telemetryMessage.vin, { receivedAt: Date.now(), state, vehicleTime });
  }

  public isSentryModeActive(vin: string): boolean {
    return this.isTrustedActiveObservation(this.findLatest(this.getHistory(vin)));
  }

  public isSentryModeActiveAt(telemetryMessage: TelemetryMessage): boolean {
    const reportedState = telemetryMessage.getSentryModeState();

    if (reportedState !== null) {
      return !INACTIVE_STATES.has(reportedState);
    }

    const messageTime = new Date(telemetryMessage.createdAt).getTime();
    return this.wasSentryModeActiveAt(telemetryMessage.vin, messageTime);
  }

  public wasSentryModeActiveAt(vin: string, vehicleTime: number): boolean {
    const observationsUntilThen = this.getHistory(vin).filter(observation => observation.vehicleTime <= vehicleTime);

    return this.isTrustedActiveObservation(this.findLatest(observationsUntilThen));
  }

  private observe(vin: string, newObservation: SentryModeObservation): void {
    const keptObservations = this.getHistory(vin).filter(previousObservation =>
      this.shouldKeepObservation(previousObservation, newObservation)
    );

    this.histories.set(vin, [...keptObservations, newObservation].sort(byVehicleTime));
  }

  private shouldKeepObservation(previousObservation: SentryModeObservation, newObservation: SentryModeObservation): boolean {
    const isSameVehicleTime = previousObservation.vehicleTime === newObservation.vehicleTime;
    const isTooOld = newObservation.receivedAt - previousObservation.receivedAt > OBSERVATION_MAX_AGE_MS;

    return !isSameVehicleTime && !isTooOld;
  }

  private getHistory(vin: string): SentryModeObservation[] {
    return this.histories.get(vin) ?? [];
  }

  private findLatest(observations: SentryModeObservation[]): SentryModeObservation | undefined {
    return observations[observations.length - 1];
  }

  private isTrustedActiveObservation(observation: SentryModeObservation | undefined): boolean {
    if (observation === undefined) {
      return false;
    }

    const isActive = !INACTIVE_STATES.has(observation.state);
    const isRecent = Date.now() - observation.receivedAt <= OBSERVATION_MAX_AGE_MS;

    return isActive && isRecent;
  }
}
