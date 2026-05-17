import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
import { AlertsOffensiveResponseService } from '../offensive-response/alerts-offensive-response.service';

export interface UpdateOffensiveResponseDto {
  break_in_offensive_response?: string;
}

export interface UpdateOffensiveResponseResult {
  success: boolean;
  break_in_offensive_response?: string;
}

@Injectable()
export class VehicleOffensiveResponseConfigService {
  private readonly logger = new Logger(VehicleOffensiveResponseConfigService.name);

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) { }

  async updateOffensiveResponse(
    userId: string,
    vin: string,
    dto: UpdateOffensiveResponseDto,
  ): Promise<UpdateOffensiveResponseResult> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { userId, vin },
    });

    if (!vehicle) {
      return { success: false };
    }

    if (dto.break_in_offensive_response) {
      vehicle.break_in_offensive_response = dto.break_in_offensive_response as OffensiveResponse;
    }

    await this.vehicleRepository.save(vehicle);
    this.logger.log(`Offensive response updated for ${vin}: break_in=${vehicle.break_in_offensive_response}`);

    return {
      success: true,
      break_in_offensive_response: vehicle.break_in_offensive_response,
    };
  }
}