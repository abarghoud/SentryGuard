import {
  FleetTelemetryConfigResponse,
  SkippedVehicle,
  SkippedVehiclesMap,
  TeslaApiResponse
} from './telemetry-config.types';

export class SkippedVehicleInfo {
  private readonly skippedVehicle: SkippedVehicle | null;

  constructor(
    vin: string,
    response: TeslaApiResponse<FleetTelemetryConfigResponse>
  ) {
    const skippedVehicles = response.response?.skipped_vehicles;
    this.skippedVehicle = this.findSkippedVehicle(vin, skippedVehicles);
  }

  get(): SkippedVehicle | null {
    if (!this.skippedVehicle) {
      return null;
    }

    return this.skippedVehicle;
  }

  private findSkippedVehicle(
    vin: string,
    skippedVehicles: SkippedVehiclesMap | undefined
  ): SkippedVehicle | null {
    if (!skippedVehicles) {
      return null;
    }

    for (const [reason, vins] of Object.entries(skippedVehicles)) {
      if (Array.isArray(vins) && vins.includes(vin)) {
        return { vin, reason };
      }
    }

    return null;
  }
}

