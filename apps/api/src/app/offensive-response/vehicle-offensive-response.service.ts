import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
import { OffensiveResponseService } from '../alerts/services/offensive-response.service';
import { OffensiveNotificationService } from './offensive-notification.service';

export interface UpdateOffensiveResponseDto {
  sentry_offensive_response?: string;
  break_in_offensive_response?: string;
  sentry_offensive_response_duration_minutes?: number;
}

export interface UpdateOffensiveResponseResult {
  success: boolean;
  sentry_offensive_response?: string;
  break_in_offensive_response?: string;
  sentry_offensive_response_until?: string | null;
}

@Injectable()
export class VehicleOffensiveResponseService {
  private readonly logger = new Logger(VehicleOffensiveResponseService.name);

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly offensiveResponseService: OffensiveResponseService,
    private readonly notificationService: OffensiveNotificationService,
  ) {}

  async updateOffensiveResponse(
    userId: string,
    vin: string,
    dto: UpdateOffensiveResponseDto,
    skipNotification = false,
  ): Promise<UpdateOffensiveResponseResult> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { userId, vin },
    });

    if (!vehicle) {
      return { success: false };
    }

    if (dto.sentry_offensive_response) {
      vehicle.sentry_offensive_response = dto.sentry_offensive_response as OffensiveResponse;

      if (dto.sentry_offensive_response === OffensiveResponse.HONK && dto.sentry_offensive_response_duration_minutes) {
        vehicle.sentry_offensive_response_until = new Date(Date.now() + dto.sentry_offensive_response_duration_minutes * 60 * 1000);
      } else if (dto.sentry_offensive_response === OffensiveResponse.DISABLED) {
        vehicle.sentry_offensive_response_until = null;
      }
    }

    if (dto.break_in_offensive_response) {
      vehicle.break_in_offensive_response = dto.break_in_offensive_response as OffensiveResponse;
    }

    await this.vehicleRepository.save(vehicle);
    this.logger.log(`Offensive response updated for ${vin}: sentry=${vehicle.sentry_offensive_response}, until=${vehicle.sentry_offensive_response_until?.toISOString() ?? 'null'}, break_in=${vehicle.break_in_offensive_response}`);

    if (!skipNotification && dto.sentry_offensive_response === OffensiveResponse.HONK && dto.sentry_offensive_response_duration_minutes) {
      try {
        await this.notificationService.notifyActivated(vehicle, dto.sentry_offensive_response_duration_minutes);
      } catch {
        this.logger.warn(`Failed to send activation notification for VIN ${vin}`);
      }
    }

    return {
      success: true,
      sentry_offensive_response: vehicle.sentry_offensive_response,
      break_in_offensive_response: vehicle.break_in_offensive_response,
      sentry_offensive_response_until: vehicle.sentry_offensive_response_until?.toISOString() ?? null,
    };
  }

  async setSentryOffensiveWithDuration(
    userId: string,
    vin: string,
    durationMinutes: number,
    skipNotification = false,
  ): Promise<UpdateOffensiveResponseResult> {
    return this.updateOffensiveResponse(userId, vin, {
      sentry_offensive_response: OffensiveResponse.HONK,
      sentry_offensive_response_duration_minutes: durationMinutes,
    }, skipNotification);
  }

  async disableSentryOffensive(
    userId: string,
    vin: string,
  ): Promise<UpdateOffensiveResponseResult> {
    return this.updateOffensiveResponse(userId, vin, {
      sentry_offensive_response: OffensiveResponse.DISABLED,
    });
  }

  async testSentryOffensiveResponse(vin: string): Promise<void> {
    await this.offensiveResponseService.handleSentryOffensiveResponse(vin);
  }

  async testBreakInOffensiveResponse(vin: string): Promise<void> {
    await this.offensiveResponseService.handleBreakInOffensiveResponse(vin);
  }
}