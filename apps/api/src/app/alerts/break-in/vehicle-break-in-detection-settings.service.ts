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

export interface BreakInDetectionGroup {
  hasCounterMeasures: boolean;
  reactionDelaySeconds: number;
  sensitivity: BreakInSensitivity;
  userIds: string[];
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
        userId: true,
      },
    });

    return this.groupByProfile(vehicles);
  }

  private groupByProfile(vehicles: Vehicle[]): BreakInDetectionGroup[] {
    const groups = new Map<string, BreakInDetectionGroup>();

    for (const vehicle of vehicles) {
      const profile = this.resolveProfile(vehicle);
      const key = `${profile.sensitivity}:${profile.reactionDelaySeconds}`;
      const group = groups.get(key) ?? { ...profile, hasCounterMeasures: false, userIds: [] };

      groups.set(key, {
        ...group,
        hasCounterMeasures: group.hasCounterMeasures || this.hasCounterMeasures(vehicle),
        userIds: [...new Set([...group.userIds, vehicle.userId])],
      });
    }

    return [...groups.values()];
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
