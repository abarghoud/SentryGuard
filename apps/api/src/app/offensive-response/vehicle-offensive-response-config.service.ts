import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
import { AccessTokenService } from '../auth/services/access-token.service';

export interface UpdateOffensiveResponseDto {
  break_in_offensive_response?: string;
  break_in_auto_sentry_mode_enabled?: boolean;
}

export interface UpdateOffensiveResponseResult {
  success: boolean;
  break_in_offensive_response?: string;
  break_in_auto_sentry_mode_enabled?: boolean;
}

@Injectable()
export class VehicleOffensiveResponseConfigService {
  private readonly logger = new Logger(VehicleOffensiveResponseConfigService.name);

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly accessTokenService: AccessTokenService,
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

    if (this.requiresVehicleCommandsScope(dto)) {
      const hasScope = await this.accessTokenService.hasVehicleCommandsScope(userId);
      if (!hasScope) {
        throw new ForbiddenException(
          'vehicle_cmds scope is required to enable offensive responses'
        );
      }
    }

    if (dto.break_in_offensive_response) {
      vehicle.break_in_offensive_response = dto.break_in_offensive_response as OffensiveResponse;
    }

    if (dto.break_in_auto_sentry_mode_enabled !== undefined) {
      vehicle.break_in_auto_sentry_mode_enabled = dto.break_in_auto_sentry_mode_enabled;
    }

    await this.vehicleRepository.save(vehicle);
    this.logger.log(
      `Offensive response updated for ${vin}: break_in=${vehicle.break_in_offensive_response}, auto_sentry=${vehicle.break_in_auto_sentry_mode_enabled}`
    );

    return {
      success: true,
      break_in_offensive_response: vehicle.break_in_offensive_response,
      break_in_auto_sentry_mode_enabled: vehicle.break_in_auto_sentry_mode_enabled,
    };
  }

  private requiresVehicleCommandsScope(dto: UpdateOffensiveResponseDto): boolean {
    const enablesOffensiveResponse =
      !!dto.break_in_offensive_response &&
      dto.break_in_offensive_response !== OffensiveResponse.DISABLED;
    const enablesAutoSentry = dto.break_in_auto_sentry_mode_enabled === true;

    return enablesOffensiveResponse || enablesAutoSentry;
  }
}
