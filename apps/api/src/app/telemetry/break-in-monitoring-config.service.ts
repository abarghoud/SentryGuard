import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelemetryConfigService } from './telemetry-config.service';
import { Vehicle } from '../../entities/vehicle.entity';
import { TELEMETRY_CONFIG } from './telemetry-config.constants';
import { extractErrorDetails } from './telemetry-config.helpers';

@Injectable()
export class BreakInMonitoringConfigService {
  private readonly logger = new Logger(BreakInMonitoringConfigService.name);

  constructor(
    private readonly telemetryConfigService: TelemetryConfigService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) { }

  async toggleBreakInMonitoring(
    vin: string,
    userId: string,
    enabled: boolean
  ): Promise<{ success: boolean; message: string }> {
    try {
      const vehicle = await this.getVehicle(userId, vin);
      if (!vehicle) {
        return { success: false, message: 'Vehicle not found' };
      }

      const fieldsToUpsert: Record<string, { interval_seconds: number }> = {};
      const fieldsToDelete: string[] = [];

      if (enabled) {
        const breakInIntervalSeconds = parseInt(
          process.env.BREAK_IN_MONITORING_INTERVAL_SECONDS ?? String(TELEMETRY_CONFIG.DEFAULT_BREAK_IN_MONITORING_INTERVAL),
          10
        );
        fieldsToUpsert['CenterDisplay'] = { interval_seconds: breakInIntervalSeconds };
      } else {
        fieldsToDelete.push('CenterDisplay');
      }

      const result = await this.telemetryConfigService.patchTelemetryConfig(
        vin,
        userId,
        fieldsToUpsert,
        fieldsToDelete
      );

      if (!result?.success) {
        return { success: false, message: 'Failed to push telemetry configuration to Tesla' };
      }

      vehicle.break_in_monitoring_enabled = enabled;
      await this.vehicleRepository.save(vehicle);
      this.logger.log(`Break-in monitoring ${enabled ? 'enabled' : 'disabled'} for VIN: ${vin}`);

      return { success: true, message: `Break-in monitoring ${enabled ? 'enabled' : 'disabled'} successfully` };
    } catch (error: unknown) {
      this.logger.error(`Error toggling break-in monitoring for ${vin}:`, extractErrorDetails(error));
      return { success: false, message: 'An unexpected error occurred' };
    }
  }

  private async getVehicle(userId: string, vin: string): Promise<Vehicle | null> {
    return await this.vehicleRepository.findOne({
      where: { userId, vin },
    });
  }
}
