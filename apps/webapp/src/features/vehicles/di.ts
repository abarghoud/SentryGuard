import { apiClient } from '../../core/api';
import { VehicleApiRepository } from './data/vehicle.api-repository';
import {
  GetVehiclesUseCase,
  ConfigureTelemetryUseCase,
  CheckTelemetryConfigUseCase,
  DeleteTelemetryConfigUseCase,
  ToggleBreakInMonitoringUseCase,
  UpdateOffensiveResponseUseCase,
  TestOffensiveResponseUseCase,
} from './domain/use-cases/vehicles.use-cases';

import { createUseVehiclesQuery } from './presentation/queries/use-vehicles-query';

export const vehicleRepository = new VehicleApiRepository(apiClient);

export const getVehiclesUseCase = new GetVehiclesUseCase(vehicleRepository);
export const configureTelemetryUseCase = new ConfigureTelemetryUseCase(vehicleRepository);
export const checkTelemetryConfigUseCase = new CheckTelemetryConfigUseCase(vehicleRepository);
export const deleteTelemetryConfigUseCase = new DeleteTelemetryConfigUseCase(vehicleRepository);
export const toggleBreakInMonitoringUseCase = new ToggleBreakInMonitoringUseCase(vehicleRepository);
export const updateOffensiveResponseUseCase = new UpdateOffensiveResponseUseCase(vehicleRepository);
export const testOffensiveResponseUseCase = new TestOffensiveResponseUseCase(vehicleRepository);

export const useVehiclesQuery = createUseVehiclesQuery({
  getVehiclesUseCase,
  configureTelemetryUseCase,
  deleteTelemetryConfigUseCase,
  toggleBreakInMonitoringUseCase,
  updateOffensiveResponseUseCase,
  testOffensiveResponseUseCase,
});
