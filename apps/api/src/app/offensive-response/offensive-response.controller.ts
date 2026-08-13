import {
  Controller,
  Patch,
  Param,
  Body,
  Logger,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConsentGuard } from '../../common/guards/consent.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../../entities/user.entity';
import { ThrottleOptions } from '../../config/throttle.config';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
import {
  UpdateOffensiveResponseDto,
  VehicleOffensiveResponseConfigService,
} from './vehicle-offensive-response-config.service';

@Controller('offensive-response')
@UseGuards(JwtAuthGuard, ConsentGuard)
export class OffensiveResponseController {
  private readonly logger = new Logger(OffensiveResponseController.name);

  constructor(
    private readonly vehicleOffensiveResponseConfigService: VehicleOffensiveResponseConfigService,
  ) { }

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Patch(':vin')
  async updateOffensiveResponse(
    @Param('vin') vin: string,
    @CurrentUser() user: User,
    @Body() body: UpdateOffensiveResponseDto,
  ) {
    this.validateUpdateBody(body);

    const userId = user.userId;
    this.logger.log(
      `Updating offensive response for VIN: ${vin} (user: ${userId})`
    );
    return await this.vehicleOffensiveResponseConfigService.updateOffensiveResponse(
      userId,
      vin,
      body,
    );
  }

  private validateUpdateBody(body: UpdateOffensiveResponseDto): void {
    const hasOffensiveResponse = body.break_in_offensive_response !== undefined;
    const hasAutoSentry = body.break_in_auto_sentry_mode_enabled !== undefined;

    if (!hasOffensiveResponse && !hasAutoSentry) {
      throw new BadRequestException(
        'break_in_offensive_response or break_in_auto_sentry_mode_enabled must be provided'
      );
    }

    if (hasOffensiveResponse) {
      const validResponses = Object.values(OffensiveResponse);

      if (!validResponses.includes(body.break_in_offensive_response as OffensiveResponse)) {
        throw new BadRequestException(
          `Invalid break_in_offensive_response value. Must be one of: ${validResponses.join(', ')}`
        );
      }
    }

    if (hasAutoSentry && typeof body.break_in_auto_sentry_mode_enabled !== 'boolean') {
      throw new BadRequestException(
        'break_in_auto_sentry_mode_enabled must be a boolean'
      );
    }
  }
}
