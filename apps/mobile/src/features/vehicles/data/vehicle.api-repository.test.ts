import { mock, MockProxy } from 'jest-mock-extended';

import { ApiClientRequirements } from '../../../core/api/api-client';
import { InstallationStoreRequirements } from '../../../core/api/installation-store';
import { OffensiveResponse, Vehicle, VehicleActionResponse } from '../domain/entities';
import { VehicleApiRepository } from './vehicle.api-repository';

describe('The VehicleApiRepository class', () => {
  const fakeVin = 'VIN123';
  const fakeInstallationId = 'installation-1';
  let mockClient: MockProxy<ApiClientRequirements>;
  let mockInstallationStore: MockProxy<InstallationStoreRequirements>;
  let repository: VehicleApiRepository;

  beforeEach(() => {
    mockClient = mock<ApiClientRequirements>();
    mockInstallationStore = mock<InstallationStoreRequirements>();
    mockInstallationStore.getInstallationId.mockResolvedValue(fakeInstallationId);
    repository = new VehicleApiRepository(mockClient, mockInstallationStore);
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

  describe('The getHiddenVehicleVins() method', () => {
    describe('When the API returns hidden vins', () => {
      let result: string[];

      beforeEach(async () => {
        mockClient.request.mockResolvedValue([fakeVin]);
        result = await repository.getHiddenVehicleVins();
      });

      it('should request the device hidden-vehicles endpoint', () => {
        expect(mockClient.request).toHaveBeenCalledWith(`/devices/${fakeInstallationId}/hidden-vehicles`);
      });

      it('should return the hidden vins', () => {
        expect(result).toEqual([fakeVin]);
      });
    });
  });

  describe('The setVehicleHidden() method', () => {
    describe('When hiding a vehicle', () => {
      beforeEach(async () => {
        mockClient.request.mockResolvedValue({ success: true } as VehicleActionResponse);
        await repository.setVehicleHidden(fakeVin, true);
      });

      it('should POST the vin to the device hidden-vehicles endpoint', () => {
        expect(mockClient.request).toHaveBeenCalledWith(`/devices/${fakeInstallationId}/hidden-vehicles`, {
          body: JSON.stringify({ vin: fakeVin }),
          method: 'POST',
        });
      });
    });

    describe('When restoring a vehicle', () => {
      beforeEach(async () => {
        mockClient.request.mockResolvedValue({ success: true } as VehicleActionResponse);
        await repository.setVehicleHidden(fakeVin, false);
      });

      it('should DELETE the vin from the device hidden-vehicles endpoint', () => {
        expect(mockClient.request).toHaveBeenCalledWith(`/devices/${fakeInstallationId}/hidden-vehicles/${fakeVin}`, {
          method: 'DELETE',
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
