import { OffensiveResponse, Vehicle, VehicleActionResponse } from '../entities';
import { VehicleRepositoryRequirements } from '../vehicle.repository.requirements';
import {
  ConfigureTelemetryRequirements,
  DeleteTelemetryConfigRequirements,
  GetHiddenVehicleVinsRequirements,
  GetVehiclesRequirements,
  SetVehicleHiddenRequirements,
  ToggleBreakInMonitoringRequirements,
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

export class GetHiddenVehicleVinsUseCase implements GetHiddenVehicleVinsRequirements {
  public constructor(private readonly repository: VehicleRepositoryRequirements) {}

  public async execute(): Promise<string[]> {
    return this.repository.getHiddenVehicleVins();
  }
}

export class SetVehicleHiddenUseCase implements SetVehicleHiddenRequirements {
  public constructor(private readonly repository: VehicleRepositoryRequirements) {}

  public async execute(vin: string, shouldHide: boolean): Promise<VehicleActionResponse> {
    return this.repository.setVehicleHidden(vin, shouldHide);
  }
}

export class ToggleBreakInMonitoringUseCase implements ToggleBreakInMonitoringRequirements {
  public constructor(private readonly repository: VehicleRepositoryRequirements) {}

  public async execute(vin: string, shouldEnable: boolean): Promise<VehicleActionResponse> {
    return this.repository.toggleBreakInMonitoring(vin, shouldEnable);
  }
}

export class UpdateOffensiveResponseUseCase implements UpdateOffensiveResponseRequirements {
  public constructor(private readonly repository: VehicleRepositoryRequirements) {}

  public async execute(vin: string, breakInOffensiveResponse: OffensiveResponse): Promise<VehicleActionResponse> {
    return this.repository.updateOffensiveResponse(vin, breakInOffensiveResponse);
  }
}
