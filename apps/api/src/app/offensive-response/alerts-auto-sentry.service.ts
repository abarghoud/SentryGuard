import { Injectable, Logger } from '@nestjs/common';
import { Vehicle } from '../../entities/vehicle.entity';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { LatencyGuardService } from '../../common/services/latency-guard.service';
import { SentryModeStateTrackerService } from './sentry-mode-state-tracker.service';

export type AutoSentryVehicle = Pick<Vehicle, 'break_in_auto_sentry_mode_enabled' | 'userId' | 'vin'>;

export interface AutoSentryResult {
  isSentryModeActivated: boolean;
}

@Injectable()
export class AlertsAutoSentryService {
  private readonly logger = new Logger(AlertsAutoSentryService.name);

  constructor(
    private readonly teslaVehicleCommandService: TeslaVehicleCommandService,
    private readonly latencyGuardService: LatencyGuardService,
    private readonly sentryModeStateTracker: SentryModeStateTrackerService,
  ) {}

  public async handleBreakInAutoSentry(
    vin: string,
    vehicles: AutoSentryVehicle[],
    createdAt: string,
    reactionDelayMs = 0,
  ): Promise<AutoSentryResult> {
    if (
      this.latencyGuardService.checkLatency({
        vin,
        createdAt,
        logContext: 'AUTO_SENTRY',
        envVarThresholdName: 'AUTO_SENTRY_LATENCY_THRESHOLD_MS',
        defaultThresholdMs: 60000,
        alertPrefix: 'AUTO_SENTRY_LATENCY_ALERT',
        intentionalDelayMs: reactionDelayMs,
        actionName: 'Auto sentry',
      })
    ) {
      return { isSentryModeActivated: false };
    }

    if (this.sentryModeStateTracker.isSentryModeActive(vin)) {
      this.logger.log(`[AUTO_SENTRY] Sentry Mode already active for VIN ${vin}, skipping set_sentry_mode`);
      return { isSentryModeActivated: false };
    }

    return { isSentryModeActivated: await this.processAutoSentryForVehicles(vin, vehicles) };
  }

  private async processAutoSentryForVehicles(vin: string, vehicles: AutoSentryVehicle[]): Promise<boolean> {
    for (const vehicle of vehicles) {
      if (vehicle.break_in_auto_sentry_mode_enabled && await this.executeAutoSentry(vehicle)) {
        return true;
      }
    }
    this.logger.debug(
      `[AUTO_SENTRY] No eligible user found for break-in auto sentry on VIN ${vin}`,
    );
    return false;
  }

  private async executeAutoSentry(vehicle: AutoSentryVehicle): Promise<boolean> {
    const { vin, userId } = vehicle;

    try {
      const result = await this.teslaVehicleCommandService.setSentryMode(vin, userId, true);

      if (result.success) {
        this.logger.log(`[AUTO_SENTRY] set_sentry_mode triggered for VIN ${vin}`);
        return true;
      }

      this.logger.warn(`[AUTO_SENTRY] set_sentry_mode failed for VIN ${vin}: ${result.message}`);
      return false;
    } catch (error: unknown) {
      this.logger.error(`[AUTO_SENTRY] Error triggering set_sentry_mode for VIN ${vin}`, error);
      return false;
    }
  }
}
