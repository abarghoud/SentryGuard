import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Vehicle } from '../../../entities/vehicle.entity';
import { OffensiveResponse } from '../enums/offensive-response.enum';
import {
  BREAK_IN_REACTION_DELAYS_SECONDS,
  BreakInSensitivity,
  DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS,
  DEFAULT_BREAK_IN_SENSITIVITY,
} from '../enums/break-in-sensitivity.enum';

export type BreakInDetectionVehicle = Pick<
  Vehicle,
  'break_in_auto_sentry_mode_enabled' | 'break_in_offensive_response' | 'display_name' | 'userId' | 'vin'
>;

export interface BreakInDetectionGroup {
  hasCounterMeasures: boolean;
  reactionDelaySeconds: number;
  sensitivity: BreakInSensitivity;
  vehicles: BreakInDetectionVehicle[];
}

type BreakInDetectionProfile = Pick<BreakInDetectionGroup, 'reactionDelaySeconds' | 'sensitivity'>;

@Injectable()
export class VehicleBreakInDetectionSettingsService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  public async findGroupsByVin(vin: string): Promise<BreakInDetectionGroup[]> {
    const vehicles = await this.vehicleRepository.find({
      where: { vin },
      select: {
        break_in_auto_sentry_mode_enabled: true,
        break_in_offensive_response: true,
        break_in_reaction_delay_seconds: true,
        break_in_sensitivity: true,
        display_name: true,
        userId: true,
        vin: true,
      },
    });

    return this.groupByProfile(vehicles);
  }

  private groupByProfile(vehicles: Vehicle[]): BreakInDetectionGroup[] {
    const groups = new Map<string, BreakInDetectionGroup>();

    for (const vehicle of vehicles) {
      const profile = this.resolveProfile(vehicle);
      const key = `${profile.sensitivity}:${profile.reactionDelaySeconds}`;
      const group = groups.get(key) ?? { ...profile, hasCounterMeasures: false, vehicles: [] };

      groups.set(key, {
        ...group,
        hasCounterMeasures: group.hasCounterMeasures || this.hasCounterMeasures(vehicle),
        vehicles: [...group.vehicles, this.toDetectionVehicle(vehicle)],
      });
    }

    return [...groups.values()];
  }

  private toDetectionVehicle(vehicle: Vehicle): BreakInDetectionVehicle {
    return {
      break_in_auto_sentry_mode_enabled: vehicle.break_in_auto_sentry_mode_enabled,
      break_in_offensive_response: vehicle.break_in_offensive_response,
      display_name: vehicle.display_name,
      userId: vehicle.userId,
      vin: vehicle.vin,
    };
  }

  private hasCounterMeasures(vehicle: Vehicle): boolean {
    return vehicle.break_in_offensive_response !== OffensiveResponse.DISABLED || vehicle.break_in_auto_sentry_mode_enabled;
  }

  private resolveProfile(vehicle: Vehicle): BreakInDetectionProfile {
    const isKnownDelay = (BREAK_IN_REACTION_DELAYS_SECONDS as readonly number[]).includes(vehicle.break_in_reaction_delay_seconds);
    const isKnownSensitivity = Object.values(BreakInSensitivity).includes(vehicle.break_in_sensitivity);

    return {
      reactionDelaySeconds: isKnownDelay ? vehicle.break_in_reaction_delay_seconds : DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS,
      sensitivity: isKnownSensitivity ? vehicle.break_in_sensitivity : DEFAULT_BREAK_IN_SENSITIVITY,
    };
  }
}
