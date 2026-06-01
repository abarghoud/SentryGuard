import { mock, MockProxy } from 'jest-mock-extended';

import { OffensiveResponse, Vehicle, VehicleActionResponse } from '../entities';
import { VehicleRepositoryRequirements } from '../vehicle.repository.requirements';
import {
  ConfigureTelemetryUseCase,
  DeleteTelemetryConfigUseCase,
  GetVehiclesUseCase,
  ToggleBreakInMonitoringUseCase,
  UpdateOffensiveResponseUseCase,
} from './vehicles.use-cases';

describe('The vehicles use cases', () => {
  const fakeVin = 'VIN123';
  let mockRepository: MockProxy<VehicleRepositoryRequirements>;

  beforeEach(() => {
    mockRepository = mock<VehicleRepositoryRequirements>();
  });

  describe('The GetVehiclesUseCase class', () => {
    describe('When vehicles are available', () => {
      let result: Vehicle[];
      const expectedVehicles = [{ vin: fakeVin }] as unknown as Vehicle[];

      beforeEach(async () => {
        mockRepository.getVehicles.mockResolvedValue(expectedVehicles);
        result = await new GetVehiclesUseCase(mockRepository).execute();
      });

      it('should return the vehicles from the repository', () => {
        expect(result).toBe(expectedVehicles);
      });
    });
  });

  describe('The ConfigureTelemetryUseCase class', () => {
    describe('When configuring telemetry for a vehicle', () => {
      const expectedResponse = { message: 'ok' } as VehicleActionResponse;
      let result: VehicleActionResponse;

      beforeEach(async () => {
        mockRepository.configureTelemetry.mockResolvedValue(expectedResponse);
        result = await new ConfigureTelemetryUseCase(mockRepository).execute(fakeVin);
      });

      it('should delegate to the repository with the vin', () => {
        expect(mockRepository.configureTelemetry).toHaveBeenCalledWith(fakeVin);
      });

      it('should return the repository response', () => {
        expect(result).toBe(expectedResponse);
      });
    });
  });

  describe('The DeleteTelemetryConfigUseCase class', () => {
    describe('When deleting a telemetry config', () => {
      beforeEach(async () => {
        mockRepository.deleteTelemetryConfig.mockResolvedValue({ message: 'ok' } as VehicleActionResponse);
        await new DeleteTelemetryConfigUseCase(mockRepository).execute(fakeVin);
      });

      it('should delegate to the repository with the vin', () => {
        expect(mockRepository.deleteTelemetryConfig).toHaveBeenCalledWith(fakeVin);
      });
    });
  });

  describe('The ToggleBreakInMonitoringUseCase class', () => {
    describe('When enabling break-in monitoring', () => {
      beforeEach(async () => {
        mockRepository.toggleBreakInMonitoring.mockResolvedValue({ message: 'ok' } as VehicleActionResponse);
        await new ToggleBreakInMonitoringUseCase(mockRepository).execute(fakeVin, true);
      });

      it('should delegate to the repository with the vin and flag', () => {
        expect(mockRepository.toggleBreakInMonitoring).toHaveBeenCalledWith(fakeVin, true);
      });
    });
  });

  describe('The UpdateOffensiveResponseUseCase class', () => {
    describe('When updating the offensive response', () => {
      beforeEach(async () => {
        mockRepository.updateOffensiveResponse.mockResolvedValue({ message: 'ok' } as VehicleActionResponse);
        await new UpdateOffensiveResponseUseCase(mockRepository).execute(fakeVin, OffensiveResponse.Honk);
      });

      it('should forward the arguments to the repository', () => {
        expect(mockRepository.updateOffensiveResponse).toHaveBeenCalledWith(fakeVin, OffensiveResponse.Honk);
      });
    });
  });
});
