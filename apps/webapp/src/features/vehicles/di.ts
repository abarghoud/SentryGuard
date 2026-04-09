import { apiClient } from '../../core/api';
import { VehicleApiRepository } from './data/vehicle.api-repository';
import {
  GetVehiclesUseCase,
  ConfigureTelemetryUseCase,
  CheckTelemetryConfigUseCase,
  DeleteTelemetryConfigUseCase,
  ToggleBreakInMonitoringUseCase,
} from './domain/use-cases/vehicles.use-cases';

import { createVehiclesStore } from './presentation/store/vehicles.store';

export const vehicleRepository = new VehicleApiRepository(apiClient);

export const getVehiclesUseCase = new GetVehiclesUseCase(vehicleRepository);
export const configureTelemetryUseCase = new ConfigureTelemetryUseCase(vehicleRepository);
export const checkTelemetryConfigUseCase = new CheckTelemetryConfigUseCase(vehicleRepository);
export const deleteTelemetryConfigUseCase = new DeleteTelemetryConfigUseCase(vehicleRepository);
export const toggleBreakInMonitoringUseCase = new ToggleBreakInMonitoringUseCase(vehicleRepository);

export const useVehiclesStore = createVehiclesStore({
  getVehiclesUseCase,
  configureTelemetryUseCase,
  deleteTelemetryConfigUseCase,
  toggleBreakInMonitoringUseCase,
});
