import { mock, MockProxy } from 'jest-mock-extended';

import { ApiClientRequirements } from '../../../core/api/api-client';
import { OffensiveResponse, Vehicle, VehicleActionResponse } from '../domain/entities';
import { VehicleApiRepository } from './vehicle.api-repository';

describe('The VehicleApiRepository class', () => {
  const fakeVin = 'VIN123';
  let mockClient: MockProxy<ApiClientRequirements>;
  let repository: VehicleApiRepository;

  beforeEach(() => {
    mockClient = mock<ApiClientRequirements>();
    repository = new VehicleApiRepository(mockClient);
  });

  describe('The getVehicles() method', () => {
    describe('When the API returns vehicles', () => {
      let result: Vehicle[];
      const expectedVehicles = [{ vin: fakeVin }] as unknown as Vehicle[];

      beforeEach(async () => {
        mockClient.request.mockResolvedValue(expectedVehicles);
        result = await repository.getVehicles();
      });

      it('should request the vehicles endpoint', () => {
        expect(mockClient.request).toHaveBeenCalledWith('/telemetry-config/vehicles');
      });

      it('should return the vehicles', () => {
        expect(result).toBe(expectedVehicles);
      });
    });
  });

  describe('The configureTelemetry() method', () => {
    describe('When configuring telemetry', () => {
      beforeEach(async () => {
        mockClient.request.mockResolvedValue({} as VehicleActionResponse);
        await repository.configureTelemetry(fakeVin);
      });

      it('should POST to the configure endpoint', () => {
        expect(mockClient.request).toHaveBeenCalledWith(`/telemetry-config/configure/${fakeVin}`, { method: 'POST' });
      });
    });
  });

  describe('The toggleBreakInMonitoring() method', () => {
    describe('When enabling monitoring', () => {
      beforeEach(async () => {
        mockClient.request.mockResolvedValue({} as VehicleActionResponse);
        await repository.toggleBreakInMonitoring(fakeVin, true);
      });

      it('should POST to the enable endpoint', () => {
        expect(mockClient.request).toHaveBeenCalledWith(`/telemetry-config/break-in-monitoring/${fakeVin}/enable`, {
          method: 'POST',
        });
      });
    });

    describe('When disabling monitoring', () => {
      beforeEach(async () => {
        mockClient.request.mockResolvedValue({} as VehicleActionResponse);
        await repository.toggleBreakInMonitoring(fakeVin, false);
      });

      it('should POST to the disable endpoint', () => {
        expect(mockClient.request).toHaveBeenCalledWith(`/telemetry-config/break-in-monitoring/${fakeVin}/disable`, {
          method: 'POST',
        });
      });
    });
  });

  describe('The updateOffensiveResponse() method', () => {
    describe('When enabling the break-in offensive response', () => {
      beforeEach(async () => {
        mockClient.request.mockResolvedValue({} as VehicleActionResponse);
        await repository.updateOffensiveResponse(fakeVin, OffensiveResponse.Honk);
      });

      it('should PATCH the offensive-response endpoint with the break-in response', () => {
        expect(mockClient.request).toHaveBeenCalledWith(`/offensive-response/${fakeVin}`, {
          body: JSON.stringify({
            break_in_offensive_response: OffensiveResponse.Honk,
          }),
          method: 'PATCH',
        });
      });
    });

    describe('When disabling the break-in offensive response', () => {
      beforeEach(async () => {
        mockClient.request.mockResolvedValue({} as VehicleActionResponse);
        await repository.updateOffensiveResponse(fakeVin, OffensiveResponse.Disabled);
      });

      it('should PATCH with the disabled response', () => {
        expect(mockClient.request).toHaveBeenCalledWith(`/offensive-response/${fakeVin}`, {
          body: JSON.stringify({
            break_in_offensive_response: OffensiveResponse.Disabled,
          }),
          method: 'PATCH',
        });
      });
    });
  });
});
