import { VehicleRepositoryRequirements } from '../vehicle.repository.requirements';
import { Vehicle, TelemetryConfigResult, GenericActionResponse } from '../entities';

export class GetVehiclesUseCase {
  constructor(private repository: VehicleRepositoryRequirements) {}

  async execute(): Promise<Vehicle[]> {
    return this.repository.getVehicles();
  }
}

export class ConfigureTelemetryUseCase {
  constructor(private repository: VehicleRepositoryRequirements) {}

  async execute(vin: string): Promise<TelemetryConfigResult> {
    if (!vin) throw new Error('VIN is required');
    return this.repository.configureTelemetry(vin);
  }
}

export class CheckTelemetryConfigUseCase {
  constructor(private repository: VehicleRepositoryRequirements) {}

  async execute(vin: string): Promise<TelemetryConfigResult> {
    if (!vin) throw new Error('VIN is required');
    return this.repository.checkTelemetryConfig(vin);
  }
}

export class DeleteTelemetryConfigUseCase {
  constructor(private repository: VehicleRepositoryRequirements) {}

  async execute(vin: string): Promise<GenericActionResponse> {
    if (!vin) throw new Error('VIN is required');
    return this.repository.deleteTelemetryConfig(vin);
  }
}

export class ToggleBreakInMonitoringUseCase {
  constructor(private repository: VehicleRepositoryRequirements) {}

  async execute(vin: string, enable: boolean): Promise<GenericActionResponse> {
    if (!vin) throw new Error('VIN is required');
    return this.repository.toggleBreakInMonitoring(vin, enable);
  }
}
