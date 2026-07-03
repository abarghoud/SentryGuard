import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { DevicesService } from './devices.service';
import { DeviceHiddenVehicle } from '../../entities/device-hidden-vehicle.entity';

describe('The DevicesService class', () => {
  const userId = 'user-1';
  const installationId = 'installation-1';
  const vin = 'VIN-1';
  let repository: MockProxy<Repository<DeviceHiddenVehicle>>;
  let service: DevicesService;

  beforeEach(() => {
    repository = mock<Repository<DeviceHiddenVehicle>>();
    service = new DevicesService(repository);
  });

  describe('The getHiddenVehicleVins() method', () => {
    describe('When the device has hidden vehicles', () => {
      let result: string[];

      beforeEach(async () => {
        repository.find.mockResolvedValue([{ vin } as DeviceHiddenVehicle]);
        result = await service.getHiddenVehicleVins(userId, installationId);
      });

      it('should return the hidden vins for the device', () => {
        expect(result).toEqual([vin]);
      });
    });
  });

  describe('The getInstallationIdsHidingVehicle() method', () => {
    describe('When devices hide the vehicle', () => {
      let result: Set<string>;

      beforeEach(async () => {
        repository.find.mockResolvedValue([{ installationId } as DeviceHiddenVehicle]);
        result = await service.getInstallationIdsHidingVehicle(userId, vin);
      });

      it('should return the installation ids hiding the vehicle', () => {
        expect(result).toEqual(new Set([installationId]));
      });
    });
  });

  describe('The hideVehicle() method', () => {
    describe('When hiding a vehicle', () => {
      beforeEach(async () => {
        await service.hideVehicle(userId, installationId, vin);
      });

      it('should upsert the hidden-vehicle row keyed by user, installation and vin', () => {
        expect(repository.upsert).toHaveBeenCalledWith(
          { userId, installationId, vin },
          { conflictPaths: ['userId', 'installationId', 'vin'], skipUpdateIfNoValuesChanged: true }
        );
      });
    });
  });

  describe('The unhideVehicle() method', () => {
    describe('When restoring a vehicle', () => {
      beforeEach(async () => {
        await service.unhideVehicle(userId, installationId, vin);
      });

      it('should delete the hidden-vehicle row', () => {
        expect(repository.delete).toHaveBeenCalledWith({ userId, installationId, vin });
      });
    });
  });
});
