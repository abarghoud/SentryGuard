import { Injectable, Logger } from '@nestjs/common';

import { TelemetryEventHandler } from '../../telemetry/interfaces/telemetry-event-handler.interface';
import { TelemetryMessage } from '../../telemetry/models/telemetry-message.model';
import { VehicleAlertNotifierService } from '../common/vehicle-alert-notifier.service';
import { AlertsOffensiveResponseService } from '../../offensive-response/alerts-offensive-response.service';
import { AlertsAutoSentryService, AutoSentryResult } from '../../offensive-response/alerts-auto-sentry.service';
import { SentryModeStateTrackerService } from '../../offensive-response/sentry-mode-state-tracker.service';
import { AlertEventSeverity, AlertEventType } from '../../../entities/alert-event.entity';
import { BreakInSensitivity, DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS } from '../enums/break-in-sensitivity.enum';
import { CounterMeasure } from '../enums/counter-measure.enum';
import { OffensiveResponse } from '../enums/offensive-response.enum';

import { BreakInEventTrackerService, BreakInTrackedEvent, BreakInTrigger } from './break-in-event-tracker.service';
import {
  BreakInDetectionGroup,
  BreakInDetectionVehicle,
  VehicleBreakInDetectionSettingsService,
} from './vehicle-break-in-detection-settings.service';
import { CounterMeasureNotifierService } from './counter-measure-notifier.service';

const OFFENSIVE_COUNTER_MEASURES: Partial<Record<OffensiveResponse, CounterMeasure>> = {
  [OffensiveResponse.FART]: CounterMeasure.Fart,
  [OffensiveResponse.HONK]: CounterMeasure.Honk,
};

@Injectable()
export class BreakInAlertHandlerService implements TelemetryEventHandler {
  private readonly logger = new Logger(BreakInAlertHandlerService.name);
  private readonly pendingVerifications = new Set<Promise<void>>();

  constructor(
    private readonly alertNotifier: VehicleAlertNotifierService,
    private readonly eventTracker: BreakInEventTrackerService,
    private readonly offensiveResponseService: AlertsOffensiveResponseService,
    private readonly autoSentryService: AlertsAutoSentryService,
    private readonly detectionSettingsService: VehicleBreakInDetectionSettingsService,
    private readonly counterMeasureNotifier: CounterMeasureNotifierService,
    private readonly sentryModeStateTracker: SentryModeStateTrackerService,
  ) {}

  public async handle(telemetryMessage: TelemetryMessage): Promise<void> {
    this.trackOwnerSignals(telemetryMessage);

    if (telemetryMessage.isCenterDisplayLocked() && !this.isLockedWhileSentryModeIsOn(telemetryMessage)) {
      await this.handleLock(telemetryMessage);
    }
  }

  public async flushPendingVerifications(timeoutMs: number): Promise<void> {
    if (this.pendingVerifications.size === 0) {
      return;
    }

    this.logger.log(`⏳ Waiting for ${this.pendingVerifications.size} pending display-lock alert verification(s) to flush...`);

    const deadline = Date.now() + timeoutMs;

    while (this.pendingVerifications.size > 0 && Date.now() < deadline) {
      const current = [...this.pendingVerifications];
      const remaining = deadline - Date.now();

      await Promise.race([
        Promise.allSettled(current),
        new Promise<void>((resolve) => setTimeout(resolve, remaining)),
      ]);
    }

    this.logger.log('✅ Pending display-lock alert verifications flushed');
  }

  private trackOwnerSignals(telemetryMessage: TelemetryMessage): void {
    const eventTime = new Date(telemetryMessage.createdAt).getTime();

    const latchDatum = telemetryMessage.data.find(datum => datum.key === 'ChargePortLatch');
    if (latchDatum?.value.chargePortLatchValue === 'ChargePortLatchDisengaged') {
      this.eventTracker.track(telemetryMessage.vin, BreakInTrackedEvent.ChargePortLatchDisengaged, eventTime);
    }

    if (telemetryMessage.isCenterDisplayOwnerActivity()) {
      this.eventTracker.track(telemetryMessage.vin, BreakInTrackedEvent.CenterDisplayOwnerActivity, eventTime);
    }
  }

  private async handleLock(telemetryMessage: TelemetryMessage): Promise<void> {
    const lockTime = new Date(telemetryMessage.createdAt).getTime();
    const { isAlreadyTracked } = this.eventTracker.track(telemetryMessage.vin, BreakInTrackedEvent.CenterDisplayLock, lockTime);

    if (isAlreadyTracked) {
      return;
    }

    const groups = await this.findDetectionGroups(telemetryMessage.vin);
    this.scheduleVerifications(telemetryMessage, lockTime, groups);
  }

  private scheduleVerifications(telemetryMessage: TelemetryMessage, lockTime: number, groups: BreakInDetectionGroup[]): void {
    if (groups.length === 0) {
      return;
    }

    const counterMeasureGroups = groups.filter(group => group.hasCounterMeasures);
    this.scheduleNotification(telemetryMessage, lockTime, this.resolveNotificationDelaySeconds(counterMeasureGroups));
    counterMeasureGroups.forEach(group => this.scheduleCounterMeasures(telemetryMessage, lockTime, group));
  }

  private isLockedWhileSentryModeIsOn(telemetryMessage: TelemetryMessage): boolean {
    if (!this.sentryModeStateTracker.isSentryModeActiveAt(telemetryMessage)) {
      return false;
    }

    this.logger.log(`[False Positive Prevented] Ignoring CenterDisplay Lock for VIN ${telemetryMessage.vin}: Sentry Mode is already on.`);
    return true;
  }

  private async findDetectionGroups(vin: string): Promise<BreakInDetectionGroup[]> {
    try {
      return await this.detectionSettingsService.findGroupsByVin(vin);
    } catch (error) {
      this.logger.error(`Failed to load the break-in detection settings for VIN ${vin}:`, error);
      return [];
    }
  }

  private resolveNotificationDelaySeconds(counterMeasureGroups: BreakInDetectionGroup[]): number {
    const counterMeasureDelaysSeconds = counterMeasureGroups.map(group => group.reactionDelaySeconds);

    return Math.min(DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS, ...counterMeasureDelaysSeconds);
  }

  private scheduleNotification(telemetryMessage: TelemetryMessage, lockTime: number, delaySeconds: number): void {
    const delayMs = delaySeconds * 1000;
    const trigger = { burstStartTime: lockTime, lockTime };

    this.scheduleVerification(delayMs, () => this.verifyAndNotify(telemetryMessage, trigger, delayMs));
  }

  private scheduleCounterMeasures(telemetryMessage: TelemetryMessage, lockTime: number, group: BreakInDetectionGroup): void {
    const trigger = this.findCounterMeasureTrigger(telemetryMessage.vin, lockTime, group.sensitivity);
    const reactionDelayMs = group.reactionDelaySeconds * 1000;

    if (trigger === null) {
      return;
    }

    this.scheduleVerification(reactionDelayMs, () => this.verifyAndTriggerCounterMeasures(telemetryMessage, trigger, group));
  }

  private findCounterMeasureTrigger(vin: string, lockTime: number, sensitivity: BreakInSensitivity): BreakInTrigger | null {
    if (sensitivity === BreakInSensitivity.RepeatedPulls) {
      return this.eventTracker.findRepeatedPullTrigger(vin, lockTime);
    }

    return { burstStartTime: lockTime, lockTime };
  }

  private scheduleVerification(delayMs: number, verify: () => Promise<void>): void {
    const verification = new Promise<void>((resolve) => {
      setTimeout(async () => {
        try {
          await verify();
        } catch (error) {
          this.logger.error('Failed to run a delayed break-in verification:', error);
        } finally {
          this.pendingVerifications.delete(verification);
          resolve();
        }
      }, delayMs);
    });

    this.pendingVerifications.add(verification);
  }

  private async verifyAndNotify(telemetryMessage: TelemetryMessage, trigger: BreakInTrigger, delayMs: number): Promise<void> {
    if (this.isFalsePositive(telemetryMessage.vin, trigger, 'break-in alert')) {
      return;
    }

    await this.alertNotifier.dispatch({
      telemetryMessage,
      alertName: 'BREAK_IN_ALERT',
      latencyLabel: 'BREAK_IN_LATENCY',
      reactionDelayMs: delayMs,
      severity: AlertEventSeverity.Critical,
      type: AlertEventType.BreakIn,
    });
  }

  private async verifyAndTriggerCounterMeasures(
    telemetryMessage: TelemetryMessage,
    trigger: BreakInTrigger,
    group: BreakInDetectionGroup
  ): Promise<void> {
    const { correlationId, vin } = telemetryMessage;

    if (this.isFalsePositive(vin, trigger, 'break-in counter-measures')) {
      return;
    }

    const counterMeasures = await this.triggerCounterMeasures(vin, trigger, group);

    if (counterMeasures.length > 0) {
      this.counterMeasureNotifier.notify(vin, group.vehicles, counterMeasures, correlationId);
    }
  }

  private async triggerCounterMeasures(vin: string, trigger: BreakInTrigger, group: BreakInDetectionGroup): Promise<CounterMeasure[]> {
    const createdAt = new Date(trigger.lockTime).toISOString();
    const reactionDelayMs = group.reactionDelaySeconds * 1000;

    const [offensiveResponse, { isSentryModeActivated }] = await Promise.all([
      this.runOffensiveResponse(vin, group.vehicles, createdAt, reactionDelayMs),
      this.runAutoSentry(vin, group.vehicles, createdAt, reactionDelayMs),
    ]);

    return this.listExecutedCounterMeasures(offensiveResponse, isSentryModeActivated);
  }

  private async runOffensiveResponse(
    vin: string,
    vehicles: BreakInDetectionVehicle[],
    createdAt: string,
    reactionDelayMs: number
  ): Promise<OffensiveResponse | null> {
    try {
      return await this.offensiveResponseService.handleBreakInOffensiveResponse(vin, vehicles, createdAt, reactionDelayMs);
    } catch (error) {
      this.logger.warn(`[OFFENSIVE] Failed to execute offensive response for VIN ${vin}`, error);
      return null;
    }
  }

  private async runAutoSentry(vin: string, vehicles: BreakInDetectionVehicle[], createdAt: string, reactionDelayMs: number): Promise<AutoSentryResult> {
    try {
      return await this.autoSentryService.handleBreakInAutoSentry(vin, vehicles, createdAt, reactionDelayMs);
    } catch (error) {
      this.logger.warn(`[AUTO_SENTRY] Failed to execute auto sentry for VIN ${vin}`, error);
      return { isSentryModeActivated: false };
    }
  }

  private listExecutedCounterMeasures(offensiveResponse: OffensiveResponse | null, isSentryModeActivated: boolean): CounterMeasure[] {
    const executedCounterMeasures: CounterMeasure[] = [];
    const offensiveCounterMeasure = offensiveResponse === null ? undefined : OFFENSIVE_COUNTER_MEASURES[offensiveResponse];

    if (offensiveCounterMeasure) {
      executedCounterMeasures.push(offensiveCounterMeasure);
    }

    if (isSentryModeActivated) {
      executedCounterMeasures.push(CounterMeasure.AutoSentry);
    }

    return executedCounterMeasures;
  }

  private isFalsePositive(vin: string, trigger: BreakInTrigger, subject: string): boolean {
    const reason = this.findFalsePositiveReason(vin, trigger);

    if (reason !== null) {
      this.logger.log(`[False Positive Prevented] Suppressing ${subject} for VIN ${vin} due to ${reason}.`);
    }

    return reason !== null;
  }

  private findFalsePositiveReason(vin: string, trigger: BreakInTrigger): string | null {
    if (this.eventTracker.hasEventAround(vin, BreakInTrackedEvent.ChargePortLatchDisengaged, trigger.lockTime)) {
      return 'correlated ChargePortLatch event';
    }

    if (this.eventTracker.hasEventSince(vin, BreakInTrackedEvent.CenterDisplayOwnerActivity, trigger.burstStartTime)) {
      return 'correlated CenterDisplay owner activity';
    }

    if (this.wasSentryModeOnDuringBurst(vin, trigger)) {
      return 'Sentry Mode already on at the lock';
    }

    return null;
  }

  private wasSentryModeOnDuringBurst(vin: string, trigger: BreakInTrigger): boolean {
    const wasOnAtFirstPull = this.sentryModeStateTracker.wasSentryModeActiveAt(vin, trigger.burstStartTime);
    const wasOnAtLastPull = this.sentryModeStateTracker.wasSentryModeActiveAt(vin, trigger.lockTime);

    return wasOnAtFirstPull || wasOnAtLastPull;
  }
}
