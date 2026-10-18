import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Vehicle } from '../../entities/vehicle.entity';
import { BreakInSensitivity } from '../alerts/enums/break-in-sensitivity.enum';
import { UpdateBreakInDetectionDto } from './update-break-in-detection.dto';

export interface UpdateBreakInDetectionResult {
  reactionDelaySeconds?: number;
  sensitivity?: BreakInSensitivity;
  success: boolean;
}

@Injectable()
export class VehicleBreakInDetectionConfigService {
  private readonly logger = new Logger(VehicleBreakInDetectionConfigService.name);

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  public async updateBreakInDetection(
    userId: string,
    vin: string,
    dto: UpdateBreakInDetectionDto
  ): Promise<UpdateBreakInDetectionResult> {
    const updateResult = await this.vehicleRepository.update(
      { userId, vin },
      { break_in_reaction_delay_seconds: dto.reactionDelaySeconds, break_in_sensitivity: dto.sensitivity }
    );

    if (!updateResult.affected) {
      return { success: false };
    }

    this.logger.log(
      `Break-in detection updated for ${vin}: sensitivity=${dto.sensitivity}, reaction_delay=${dto.reactionDelaySeconds}s`
    );

    return { reactionDelaySeconds: dto.reactionDelaySeconds, sensitivity: dto.sensitivity, success: true };
  }
}
