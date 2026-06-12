import { apiClient } from '../../core/api';
import { VehicleApiRepository } from './data/vehicle.api-repository';
import {
  ConfigureTelemetryUseCase,
  DeleteTelemetryConfigUseCase,
  GetVehiclesUseCase,
  ToggleBreakInMonitoringUseCase,
  UpdateOffensiveResponseUseCase,
} from './domain/use-cases/vehicles.use-cases';
import { createUseVehiclesQuery } from './presentation/queries/use-vehicles-query';

export const vehicleRepository = new VehicleApiRepository(apiClient);

export const getVehiclesUseCase = new GetVehiclesUseCase(vehicleRepository);
export const configureTelemetryUseCase = new ConfigureTelemetryUseCase(vehicleRepository);
export const deleteTelemetryConfigUseCase = new DeleteTelemetryConfigUseCase(vehicleRepository);
export const toggleBreakInMonitoringUseCase = new ToggleBreakInMonitoringUseCase(vehicleRepository);
export const updateOffensiveResponseUseCase = new UpdateOffensiveResponseUseCase(vehicleRepository);

export const useVehiclesQuery = createUseVehiclesQuery({ getVehiclesUseCase });
