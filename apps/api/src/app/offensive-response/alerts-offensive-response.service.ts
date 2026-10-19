import { Injectable, Logger } from '@nestjs/common';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
import { TeslaVehicleCommandService } from '../telemetry/services/tesla-vehicle-command.service';
import { LatencyGuardService } from '../../common/services/latency-guard.service';

export type OffensiveResponseVehicle = Pick<Vehicle, 'break_in_offensive_response' | 'userId' | 'vin'>;

@Injectable()
export class AlertsOffensiveResponseService {
  private readonly logger = new Logger(AlertsOffensiveResponseService.name);

  constructor(
    private readonly teslaVehicleCommandService: TeslaVehicleCommandService,
    private readonly latencyGuardService: LatencyGuardService,
  ) {}

  public async handleBreakInOffensiveResponse(
    vin: string,
    vehicles: OffensiveResponseVehicle[],
    createdAt: string,
    reactionDelayMs = 0,
  ): Promise<OffensiveResponse | null> {
    if (
      this.latencyGuardService.checkLatency({
        vin,
        createdAt,
        logContext: 'OFFENSIVE',
        envVarThresholdName: 'OFFENSIVE_RESPONSE_LATENCY_THRESHOLD_MS',
        defaultThresholdMs: 60000,
        alertPrefix: 'OFFENSIVE_LATENCY_ALERT',
        intentionalDelayMs: reactionDelayMs,
        actionName: 'Offensive response',
      })
    ) {
      return null;
    }

    return await this.processOffensiveResponseForVehicles(vin, vehicles);
  }

  private async processOffensiveResponseForVehicles(vin: string, vehicles: OffensiveResponseVehicle[]): Promise<OffensiveResponse | null> {
    for (const vehicle of vehicles) {
      if (
        vehicle.break_in_offensive_response !== OffensiveResponse.DISABLED &&
        await this.executeOffensiveResponse(vehicle)
      ) {
        return vehicle.break_in_offensive_response;
      }
    }
    this.logger.debug(
      `[OFFENSIVE] No eligible user found for break-in offensive response on VIN ${vin}`,
    );
    return null;
  }

  private async executeOffensiveResponse(vehicle: OffensiveResponseVehicle): Promise<boolean> {
    const { vin, userId, break_in_offensive_response } = vehicle;

    try {
      let result;
      if (break_in_offensive_response === OffensiveResponse.HONK) {
        result = await this.teslaVehicleCommandService.honkHorn(vin, userId);
      } else if (break_in_offensive_response === OffensiveResponse.FART) {
        result = await this.teslaVehicleCommandService.remoteBoombox(vin, userId, 1);
      } else {
        return false;
      }

      if (result.success) {
        this.logger.log(`[OFFENSIVE] ${break_in_offensive_response} triggered for VIN ${vin}`);
        return true;
      }

      this.logger.warn(`[OFFENSIVE] ${break_in_offensive_response} failed for VIN ${vin}: ${result.message}`);
      return false;
    } catch (error: unknown) {
      this.logger.error(`[OFFENSIVE] Error triggering ${break_in_offensive_response} for VIN ${vin}`, error);
      return false;
    }
  }
}
