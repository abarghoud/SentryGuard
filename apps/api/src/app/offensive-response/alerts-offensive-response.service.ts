import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';

@Injectable()
export class AlertsOffensiveResponseService {
  private readonly logger = new Logger(AlertsOffensiveResponseService.name);

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly teslaVehicleCommandService: TeslaVehicleCommandService,
  ) {}

  public async handleBreakInOffensiveResponse(
    vin: string,
    userIds: string[],
    createdAt: string,
  ): Promise<void> {
    if (this.isLatencyTooHigh(createdAt)) {
      this.logBypassedResponse(vin, createdAt);
      return;
    }

    await this.processOffensiveResponseForUsers(vin, userIds);
  }

  private isLatencyTooHigh(createdAt: string): boolean {
    const threshold = parseInt(process.env.OFFENSIVE_RESPONSE_LATENCY_THRESHOLD_MS || '60000', 10);
    return this.calculateLatency(createdAt) > threshold;
  }

  private calculateLatency(createdAt: string): number {
    return Date.now() - new Date(createdAt).getTime();
  }

  private logBypassedResponse(vin: string, createdAt: string): void {
    const latency = this.calculateLatency(createdAt);
    const threshold = process.env.OFFENSIVE_RESPONSE_LATENCY_THRESHOLD_MS || '60000';
    this.logger.warn(
      `[OFFENSIVE_LATENCY_ALERT] Offensive response bypassed for VIN ${vin} due to high latency: ${latency}ms (threshold: ${threshold}ms)`,
    );
  }

  private async processOffensiveResponseForUsers(vin: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      const vehicle = await this.findVehicleByVin(vin, userId);
      if (await this.tryExecuteForVehicle(vehicle)) {
        return;
      }
    }
    this.logger.debug(
      `[OFFENSIVE] No eligible user found for break-in offensive response on VIN ${vin}`,
    );
  }

  private async tryExecuteForVehicle(vehicle: Vehicle | null): Promise<boolean> {
    if (vehicle?.break_in_offensive_response !== OffensiveResponse.HONK) {
      return false;
    }
    return this.executeOffensiveResponse(vehicle);
  }

  private async findVehicleByVin(vin: string, userId: string): Promise<Vehicle | null> {
    return this.vehicleRepository.findOne({ where: { vin, userId } });
  }

  private async executeOffensiveResponse(vehicle: Vehicle): Promise<boolean> {
    const { vin, userId } = vehicle;
    try {
      const result = await this.teslaVehicleCommandService.honkHorn(vin, userId);
      return this.handleCommandResult(vin, result);
    } catch (error: unknown) {
      this.logger.error(`[OFFENSIVE] Error triggering honk horn for VIN ${vin}`, error);
      return false;
    }
  }

  private handleCommandResult(vin: string, result: { success: boolean; message?: string }): boolean {
    if (result.success) {
      this.logger.log(`[OFFENSIVE] Honk horn triggered for VIN ${vin}`);
      return true;
    }
    this.logger.warn(`[OFFENSIVE] Honk horn failed for VIN ${vin}: ${result.message}`);
    return false;
  }
}