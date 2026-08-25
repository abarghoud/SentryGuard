import {
  BadGatewayException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelemetryConfigService } from './telemetry-config.service';
import { Vehicle } from '../../entities/vehicle.entity';
import { TELEMETRY_CONFIG } from './telemetry-config.constants';
import { extractErrorDetails } from './telemetry-config.helpers';

const BREAK_IN_MONITORED_FIELDS = ['CenterDisplay', 'ChargePortLatch'];

export interface BreakInMonitoringToggleResult {
  success: true;
  message: string;
}

@Injectable()
export class BreakInMonitoringConfigService {
  private readonly logger = new Logger(BreakInMonitoringConfigService.name);

  constructor(
    private readonly telemetryConfigService: TelemetryConfigService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  public async toggleBreakInMonitoring(
    vin: string,
    userId: string,
    enabled: boolean
  ): Promise<BreakInMonitoringToggleResult> {
    try {
      return await this.applyBreakInMonitoring(vin, userId, enabled);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error toggling break-in monitoring for ${vin}:`, extractErrorDetails(error));
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  private async applyBreakInMonitoring(
    vin: string,
    userId: string,
    enabled: boolean
  ): Promise<BreakInMonitoringToggleResult> {
    const vehicle = await this.getVehicle(userId, vin);

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.pushBreakInMonitoringFields(vin, userId, enabled);

    vehicle.break_in_monitoring_enabled = enabled;
    await this.vehicleRepository.save(vehicle);
    this.logger.log(`Break-in monitoring ${enabled ? 'enabled' : 'disabled'} for VIN: ${vin}`);

    return { success: true, message: `Break-in monitoring ${enabled ? 'enabled' : 'disabled'} successfully` };
  }

  private async pushBreakInMonitoringFields(vin: string, userId: string, enabled: boolean): Promise<void> {
    const result = await this.telemetryConfigService.patchTelemetryConfig(
      vin,
      userId,
      this.buildFieldsToUpsert(enabled),
      enabled ? [] : [...BREAK_IN_MONITORED_FIELDS]
    );

    if (!result?.success) {
      throw new BadGatewayException('Failed to push telemetry configuration to Tesla');
    }
  }

  private buildFieldsToUpsert(enabled: boolean): Record<string, { interval_seconds: number }> {
    if (!enabled) {
      return {};
    }

    const interval_seconds = this.resolveMonitoringIntervalSeconds();

    return Object.fromEntries(BREAK_IN_MONITORED_FIELDS.map((field) => [field, { interval_seconds }]));
  }

  private resolveMonitoringIntervalSeconds(): number {
    return parseInt(
      process.env.BREAK_IN_MONITORING_INTERVAL_SECONDS ??
      String(TELEMETRY_CONFIG.DEFAULT_BREAK_IN_MONITORING_INTERVAL),
      10
    );
  }

  private async getVehicle(userId: string, vin: string): Promise<Vehicle | null> {
    return await this.vehicleRepository.findOne({
      where: { userId, vin },
    });
  }
}
