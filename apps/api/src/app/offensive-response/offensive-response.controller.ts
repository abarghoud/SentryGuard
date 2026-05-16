import {
  Controller,
  Patch,
  Post,
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
import { VehicleOffensiveResponseConfigService } from './vehicle-offensive-response-config.service';

@Controller('offensive-response')
@UseGuards(JwtAuthGuard, ConsentGuard)
export class OffensiveResponseController {
  private readonly logger = new Logger(OffensiveResponseController.name);

  constructor(
    private readonly vehicleOffensiveResponseConfigService: VehicleOffensiveResponseConfigService,
  ) {}

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Patch(':vin')
  async updateOffensiveResponse(
    @Param('vin') vin: string,
    @CurrentUser() user: User,
    @Body() body: { sentry_offensive_response?: string; break_in_offensive_response?: string; sentry_offensive_response_duration_minutes?: number },
  ) {
    if (!body.sentry_offensive_response && !body.break_in_offensive_response) {
      throw new BadRequestException(
        'At least one of sentry_offensive_response or break_in_offensive_response must be provided'
      );
    }

    const validResponses = Object.values(OffensiveResponse);

    if (body.sentry_offensive_response && !validResponses.includes(body.sentry_offensive_response as OffensiveResponse)) {
      throw new BadRequestException(
        `Invalid sentry_offensive_response value. Must be one of: ${validResponses.join(', ')}`
      );
    }

    if (body.break_in_offensive_response && !validResponses.includes(body.break_in_offensive_response as OffensiveResponse)) {
      throw new BadRequestException(
        `Invalid break_in_offensive_response value. Must be one of: ${validResponses.join(', ')}`
      );
    }

    if (body.sentry_offensive_response_duration_minutes !== undefined) {
      if (body.sentry_offensive_response !== OffensiveResponse.HONK) {
        throw new BadRequestException(
          'sentry_offensive_response_duration_minutes can only be provided when sentry_offensive_response is HONK'
        );
      }

      const MAX_DURATION_MINUTES = 24 * 60;
      if (body.sentry_offensive_response_duration_minutes < 1 || body.sentry_offensive_response_duration_minutes > MAX_DURATION_MINUTES) {
        throw new BadRequestException(
          `sentry_offensive_response_duration_minutes must be between 1 and ${MAX_DURATION_MINUTES}`
        );
      }
    }

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

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Post(':vin/test-sentry')
  async testSentryOffensiveResponse(
    @Param('vin') vin: string,
    @CurrentUser() user: User,
  ) {
    const userId = user.userId;
    this.logger.log(`Testing sentry offensive response for VIN: ${vin} (user: ${userId})`);
    await this.vehicleOffensiveResponseConfigService.testSentryOffensiveResponse(vin);
    return { message: `Sentry offensive response test triggered for VIN: ${vin}` };
  }

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Post(':vin/test-break-in')
  async testBreakInOffensiveResponse(
    @Param('vin') vin: string,
    @CurrentUser() user: User,
  ) {
    const userId = user.userId;
    this.logger.log(`Testing break-in offensive response for VIN: ${vin} (user: ${userId})`);
    await this.vehicleOffensiveResponseConfigService.testBreakInOffensiveResponse(vin);
    return { message: `Break-in offensive response test triggered for VIN: ${vin}` };
  }
}