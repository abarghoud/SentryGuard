import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { LatencyGuardService } from '../../common/services/latency-guard.service';
@Injectable()
export class AlertsAutoSentryService {
  private readonly logger = new Logger(AlertsAutoSentryService.name);

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly teslaVehicleCommandService: TeslaVehicleCommandService,
    private readonly latencyGuardService: LatencyGuardService,
  ) {}

  public async handleBreakInAutoSentry(
    vin: string,
    userIds: string[],
    createdAt: string,
  ): Promise<void> {
    if (
      this.latencyGuardService.checkLatency({
        vin,
        createdAt,
        logContext: 'AUTO_SENTRY',
        envVarThresholdName: 'AUTO_SENTRY_LATENCY_THRESHOLD_MS',
        defaultThresholdMs: 60000,
        alertPrefix: 'AUTO_SENTRY_LATENCY_ALERT',
        actionName: 'Auto sentry',
      })
    ) {
      return;
    }

    await this.processAutoSentryForUsers(vin, userIds);
  }

  private async processAutoSentryForUsers(vin: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      const vehicle = await this.findVehicleByVin(vin, userId);

      if (vehicle?.break_in_auto_sentry_mode_enabled && await this.executeAutoSentry(vehicle)) {
        return;
      }
    }
    this.logger.debug(
      `[AUTO_SENTRY] No eligible user found for break-in auto sentry on VIN ${vin}`,
    );
  }

  private async findVehicleByVin(vin: string, userId: string): Promise<Vehicle | null> {
    return this.vehicleRepository.findOne({ where: { vin, userId } });
  }

  private async executeAutoSentry(vehicle: Vehicle): Promise<boolean> {
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
