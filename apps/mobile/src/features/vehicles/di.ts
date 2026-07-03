import { apiClient, installationStore, tokenStore } from '../../core/api';
import { VehicleApiRepository } from './data/vehicle.api-repository';
import { VehicleMockRepository } from './data/vehicle.mock-repository';
import { VehicleRepositoryRequirements } from './domain/vehicle.repository.requirements';
import { OffensiveResponse, Vehicle, VehicleActionResponse } from './domain/entities';
import {
  ConfigureTelemetryUseCase,
  DeleteTelemetryConfigUseCase,
  GetHiddenVehicleVinsUseCase,
  GetVehiclesUseCase,
  SetVehicleHiddenUseCase,
  ToggleBreakInMonitoringUseCase,
  UpdateOffensiveResponseUseCase,
} from './domain/use-cases/vehicles.use-cases';
import { createUseVehiclesQuery } from './presentation/queries/use-vehicles-query';
import { createUseHiddenVehiclesQuery } from './presentation/queries/use-hidden-vehicles-query';

class DynamicVehicleRepository implements VehicleRepositoryRequirements {
  public constructor(
    private readonly apiRepo: VehicleRepositoryRequirements,
    private readonly mockRepo: VehicleRepositoryRequirements
  ) {}

  private getRepo(): VehicleRepositoryRequirements {
    return tokenStore.isDemo() ? this.mockRepo : this.apiRepo;
  }

  public async getVehicles(): Promise<Vehicle[]> {
    return this.getRepo().getVehicles();
  }

  public async getHiddenVehicleVins(): Promise<string[]> {
    return this.getRepo().getHiddenVehicleVins();
  }

  public async configureTelemetry(vin: string): Promise<VehicleActionResponse> {
    return this.getRepo().configureTelemetry(vin);
  }

  public async deleteTelemetryConfig(vin: string): Promise<VehicleActionResponse> {
    return this.getRepo().deleteTelemetryConfig(vin);
  }

  public async setVehicleHidden(vin: string, shouldHide: boolean): Promise<VehicleActionResponse> {
    return this.getRepo().setVehicleHidden(vin, shouldHide);
  }

  public async toggleBreakInMonitoring(vin: string, shouldEnable: boolean): Promise<VehicleActionResponse> {
    return this.getRepo().toggleBreakInMonitoring(vin, shouldEnable);
  }

  public async updateOffensiveResponse(vin: string, response: OffensiveResponse): Promise<VehicleActionResponse> {
    return this.getRepo().updateOffensiveResponse(vin, response);
  }
}

export const vehicleRepository = new DynamicVehicleRepository(
  new VehicleApiRepository(apiClient, installationStore),
  new VehicleMockRepository()
);

export const getVehiclesUseCase = new GetVehiclesUseCase(vehicleRepository);
export const getHiddenVehicleVinsUseCase = new GetHiddenVehicleVinsUseCase(vehicleRepository);
export const configureTelemetryUseCase = new ConfigureTelemetryUseCase(vehicleRepository);
export const deleteTelemetryConfigUseCase = new DeleteTelemetryConfigUseCase(vehicleRepository);
export const setVehicleHiddenUseCase = new SetVehicleHiddenUseCase(vehicleRepository);
export const toggleBreakInMonitoringUseCase = new ToggleBreakInMonitoringUseCase(vehicleRepository);
export const updateOffensiveResponseUseCase = new UpdateOffensiveResponseUseCase(vehicleRepository);

export const useVehiclesQuery = createUseVehiclesQuery({ getVehiclesUseCase });
export const useHiddenVehiclesQuery = createUseHiddenVehiclesQuery({ getHiddenVehicleVinsUseCase });
