import { BreakInDetection, OffensiveResponse, Vehicle, VehicleActionResponse } from '../entities';
import { VehicleRepositoryRequirements } from '../vehicle.repository.requirements';
import {
  ConfigureTelemetryRequirements,
  DeleteTelemetryConfigRequirements,
  GetVehiclesRequirements,
  ToggleBreakInMonitoringRequirements,
  UpdateAlertSoundsRequirements,
  UpdateBreakInDetectionRequirements,
  UpdateOffensiveResponseRequirements,
} from './vehicles.use-cases.requirements';

export class GetVehiclesUseCase implements GetVehiclesRequirements {
  public constructor(private readonly repository: VehicleRepositoryRequirements) {}

  public async execute(): Promise<Vehicle[]> {
    return this.repository.getVehicles();
  }
}

export class ConfigureTelemetryUseCase implements ConfigureTelemetryRequirements {
  public constructor(private readonly repository: VehicleRepositoryRequirements) {}

  public async execute(vin: string): Promise<VehicleActionResponse> {
    return this.repository.configureTelemetry(vin);
  }
}

export class DeleteTelemetryConfigUseCase implements DeleteTelemetryConfigRequirements {
  public constructor(private readonly repository: VehicleRepositoryRequirements) {}

  public async execute(vin: string): Promise<VehicleActionResponse> {
    return this.repository.deleteTelemetryConfig(vin);
  }
}

export class ToggleBreakInMonitoringUseCase implements ToggleBreakInMonitoringRequirements {
  public constructor(private readonly repository: VehicleRepositoryRequirements) {}

  public async execute(vin: string, shouldEnable: boolean): Promise<VehicleActionResponse> {
    return this.repository.toggleBreakInMonitoring(vin, shouldEnable);
  }
}

export class UpdateAlertSoundsUseCase implements UpdateAlertSoundsRequirements {
  public constructor(private readonly repository: VehicleRepositoryRequirements) {}

  public async execute(
    vin: string,
    payload: { breakInAlertSound?: string; sentryAlertSound?: string },
  ): Promise<VehicleActionResponse> {
    return this.repository.updateAlertSounds(vin, payload);
  }
}

export class UpdateBreakInDetectionUseCase implements UpdateBreakInDetectionRequirements {
  public constructor(private readonly repository: VehicleRepositoryRequirements) {}

  public async execute(vin: string, breakInDetection: BreakInDetection): Promise<VehicleActionResponse> {
    return this.repository.updateBreakInDetection(vin, breakInDetection);
  }
}

export class UpdateOffensiveResponseUseCase implements UpdateOffensiveResponseRequirements {
  public constructor(private readonly repository: VehicleRepositoryRequirements) {}

  public async execute(
    vin: string,
    payload: { breakInOffensiveResponse?: OffensiveResponse; autoSentryEnabled?: boolean },
  ): Promise<VehicleActionResponse> {
    return this.repository.updateOffensiveResponse(vin, payload);
  }
}
