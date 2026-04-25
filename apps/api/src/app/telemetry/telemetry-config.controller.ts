import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  Logger,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TelemetryConfigService } from './telemetry-config.service';
import { SentryModeConfigService } from './sentry-mode-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConsentGuard } from '../../common/guards/consent.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../../entities/user.entity';
import { ThrottleOptions } from '../../config/throttle.config';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
import { OffensiveResponseService } from '../alerts/services/offensive-response.service';

@Controller('telemetry-config')
@UseGuards(JwtAuthGuard, ConsentGuard)
export class TelemetryConfigController {
  private readonly logger = new Logger(TelemetryConfigController.name);

  constructor(
    private readonly telemetryConfigService: TelemetryConfigService,
    private readonly sentryModeConfigService: SentryModeConfigService,
    private readonly offensiveResponseService: OffensiveResponseService
  ) {}

  @Throttle(ThrottleOptions.authenticatedRead())
  @Get('vehicles')
  async getVehicles(@CurrentUser() user: User) {
    const userId = user.userId;
    this.logger.log(
      `🔍 Retrieving vehicle list for user: ${userId} (${user.email})`
    );
    return await this.telemetryConfigService.getVehicles(userId);
  }

  @Throttle(ThrottleOptions.critical())
  @Post('configure/:vin')
  async configureVehicle(@Param('vin') vin: string, @CurrentUser() user: User) {
    const userId = user.userId;
    this.logger.log(
      `🚗 Configuring telemetry for VIN: ${vin} (user: ${userId})`
    );
    const result = await this.sentryModeConfigService.configureTelemetry(
      vin,
      userId
    );
    if (!result) {
      return { message: `Configuration failed for VIN: ${vin}` };
    }

    if (result.skippedVehicle) {
      return {
        message: `Configuration skipped for VIN: ${vin}`,
        result,
      };
    }

    return { message: `Configuration started for VIN: ${vin}`, result };
  }

  @Throttle(ThrottleOptions.authenticatedRead())
  @Get('check/:vin')
  async checkConfiguration(
    @Param('vin') vin: string,
    @CurrentUser() user: User
  ) {
    const userId = user.userId;
    this.logger.log(
      `🔍 Checking configuration for VIN: ${vin} (user: ${userId})`
    );
    const result = await this.telemetryConfigService.checkTelemetryConfig(
      vin,
      userId
    );
    return { message: `Configuration checked for VIN: ${vin}`, result };
  }

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Delete(':vin')
  async deleteTelemetryConfig(
    @Param('vin') vin: string,
    @CurrentUser() user: User
  ) {
    const userId = user.userId;
    this.logger.log(
      `🗑️ Deleting telemetry configuration for VIN: ${vin} (user: ${userId})`
    );
    return await this.telemetryConfigService.deleteTelemetryConfig(vin, userId);
  }

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Patch(':vin/offensive-response')
  async updateOffensiveResponse(
    @Param('vin') vin: string,
    @CurrentUser() user: User,
    @Body() body: { offensive_response: string }
  ) {
    const validResponses = Object.values(OffensiveResponse);
    if (!validResponses.includes(body.offensive_response as OffensiveResponse)) {
      throw new BadRequestException(
        `Invalid offensive_response value. Must be one of: ${validResponses.join(', ')}`
      );
    }

    const userId = user.userId;
    this.logger.log(
      `🚨 Updating offensive response for VIN: ${vin} to ${body.offensive_response} (user: ${userId})`
    );
    return await this.telemetryConfigService.updateVehicleOffensiveResponse(
      userId,
      vin,
      body.offensive_response
    );
  }

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Post(':vin/test-offensive')
  async testOffensiveResponse(
    @Param('vin') vin: string,
    @CurrentUser() user: User
  ) {
    const userId = user.userId;
    this.logger.log(`🧪 Testing offensive response for VIN: ${vin} (user: ${userId})`);
    await this.offensiveResponseService.handleOffensiveResponse(vin);
    return { message: `Offensive response test triggered for VIN: ${vin}` };
  }
}
