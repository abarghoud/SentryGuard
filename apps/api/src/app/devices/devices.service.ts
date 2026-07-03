import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DeviceHiddenVehicle } from '../../entities/device-hidden-vehicle.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(DeviceHiddenVehicle)
    private readonly deviceHiddenVehicleRepository: Repository<DeviceHiddenVehicle>
  ) {}

  public async getHiddenVehicleVins(userId: string, installationId: string): Promise<string[]> {
    const rows = await this.deviceHiddenVehicleRepository.find({
      where: { userId, installationId },
      select: { vin: true },
    });
    return rows.map((row) => row.vin);
  }

  public async getInstallationIdsHidingVehicle(userId: string, vin: string): Promise<Set<string>> {
    const rows = await this.deviceHiddenVehicleRepository.find({
      where: { userId, vin },
      select: { installationId: true },
    });
    return new Set(rows.map((row) => row.installationId));
  }

  public async hideVehicle(userId: string, installationId: string, vin: string): Promise<{ success: boolean }> {
    await this.deviceHiddenVehicleRepository.upsert(
      { userId, installationId, vin },
      { conflictPaths: ['userId', 'installationId', 'vin'], skipUpdateIfNoValuesChanged: true }
    );
    return { success: true };
  }

  public async unhideVehicle(userId: string, installationId: string, vin: string): Promise<{ success: boolean }> {
    await this.deviceHiddenVehicleRepository.delete({ userId, installationId, vin });
    return { success: true };
  }
}
