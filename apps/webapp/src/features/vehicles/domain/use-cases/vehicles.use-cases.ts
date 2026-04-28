import { VehicleRepositoryRequirements } from '../vehicle.repository.requirements';
import { Vehicle, TelemetryConfigResult, GenericActionResponse } from '../entities';
import {
  GetVehiclesRequirements,
  ConfigureTelemetryRequirements,
  CheckTelemetryConfigRequirements,
  DeleteTelemetryConfigRequirements,
  ToggleBreakInMonitoringRequirements,
  UpdateOffensiveResponseRequirements,
  TestOffensiveResponseRequirements,
} from './vehicles.use-cases.requirements';

export class GetVehiclesUseCase implements GetVehiclesRequirements {
  constructor(private repository: VehicleRepositoryRequirements) {}

  async execute(): Promise<Vehicle[]> {
    return this.repository.getVehicles();
  }
}

export class ConfigureTelemetryUseCase implements ConfigureTelemetryRequirements {
  constructor(private repository: VehicleRepositoryRequirements) {}

  async execute(vin: string): Promise<TelemetryConfigResult> {
    if (!vin) throw new Error('VIN is required');
    return this.repository.configureTelemetry(vin);
  }
}

export class CheckTelemetryConfigUseCase implements CheckTelemetryConfigRequirements {
  constructor(private repository: VehicleRepositoryRequirements) {}

  async execute(vin: string): Promise<TelemetryConfigResult> {
    if (!vin) throw new Error('VIN is required');
    return this.repository.checkTelemetryConfig(vin);
  }
}

export class DeleteTelemetryConfigUseCase implements DeleteTelemetryConfigRequirements {
  constructor(private repository: VehicleRepositoryRequirements) {}

  async execute(vin: string): Promise<GenericActionResponse> {
    if (!vin) throw new Error('VIN is required');
    return this.repository.deleteTelemetryConfig(vin);
  }
}

export class ToggleBreakInMonitoringUseCase implements ToggleBreakInMonitoringRequirements {
  constructor(private repository: VehicleRepositoryRequirements) {}

  async execute(vin: string, enable: boolean): Promise<GenericActionResponse> {
    if (!vin) throw new Error('VIN is required');
    return this.repository.toggleBreakInMonitoring(vin, enable);
  }
}

export class UpdateOffensiveResponseUseCase implements UpdateOffensiveResponseRequirements {
  constructor(private repository: VehicleRepositoryRequirements) {}

  async execute(vin: string, offensiveResponse: string): Promise<GenericActionResponse> {
    if (!vin) throw new Error('VIN is required');
    return this.repository.updateOffensiveResponse(vin, offensiveResponse);
  }
}

export class TestOffensiveResponseUseCase implements TestOffensiveResponseRequirements {
  constructor(private repository: VehicleRepositoryRequirements) {}

  async execute(vin: string): Promise<GenericActionResponse> {
    if (!vin) throw new Error('VIN is required');
    return this.repository.testOffensiveResponse(vin);
  }
}
