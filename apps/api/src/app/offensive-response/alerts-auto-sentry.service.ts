import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';

@Injectable()
export class AlertsAutoSentryService {
  private readonly logger = new Logger(AlertsAutoSentryService.name);
  private readonly clockSkewToleranceMs = 30_000;

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly teslaVehicleCommandService: TeslaVehicleCommandService,
  ) {}

  public async handleBreakInAutoSentry(
    vin: string,
    userIds: string[],
    createdAt: string,
  ): Promise<void> {
    if (this.isLatencyTooHigh(createdAt)) {
      this.logBypassedResponse(vin, createdAt);
      return;
    }

    await this.processAutoSentryForUsers(vin, userIds);
  }

  private parseTimestamp(createdAt: string): number | null {
    const time = new Date(createdAt).getTime();
    return isNaN(time) ? null : time;
  }

  private isLatencyTooHigh(createdAt: string): boolean {
    const time = this.parseTimestamp(createdAt);
    if (time === null) {
      this.logger.error(`[AUTO_SENTRY] Invalid createdAt timestamp received: "${createdAt}"`);
      return true;
    }
    const latency = Date.now() - time;
    if (latency < -this.clockSkewToleranceMs) {
      this.logger.error(`[AUTO_SENTRY] Future createdAt timestamp received: "${createdAt}"`);
      return true;
    }
    const threshold = parseInt(process.env.OFFENSIVE_RESPONSE_LATENCY_THRESHOLD_MS || '60000', 10);
    return latency > threshold;
  }

  private calculateLatency(createdAt: string): number {
    const time = this.parseTimestamp(createdAt);
    if (time === null) {
      return 0;
    }
    return Math.max(0, Date.now() - time);
  }

  private logBypassedResponse(vin: string, createdAt: string): void {
    const latency = this.calculateLatency(createdAt);
    const threshold = process.env.OFFENSIVE_RESPONSE_LATENCY_THRESHOLD_MS || '60000';
    this.logger.warn(
      `[AUTO_SENTRY_LATENCY_ALERT] Auto sentry bypassed for VIN ${vin} due to high latency: ${latency}ms (threshold: ${threshold}ms)`,
    );
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
