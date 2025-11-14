import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TelemetryConfigService } from './telemetry-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../../entities/user.entity';
import { ThrottleOptions } from '../../config/throttle.config';

@Controller('telemetry-config')
@UseGuards(JwtAuthGuard)
export class TelemetryConfigController {
  private readonly logger = new Logger(TelemetryConfigController.name);

  constructor(
    private readonly telemetryConfigService: TelemetryConfigService
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
  @Post('configure-all')
  async configureAllVehicles(@CurrentUser() user: User) {
    const userId = user.userId;
    this.logger.log(
      `🚗 Configuring telemetry for all vehicles (user: ${userId})`
    );
    await this.telemetryConfigService.configureAllVehicles(userId);
    return { message: 'Telemetry configuration started for all vehicles' };
  }

  @Throttle(ThrottleOptions.critical())
  @Post('configure/:vin')
  async configureVehicle(@Param('vin') vin: string, @CurrentUser() user: User) {
    const userId = user.userId;
    this.logger.log(
      `🚗 Configuring telemetry for VIN: ${vin} (user: ${userId})`
    );
    const result = await this.telemetryConfigService.configureTelemetry(
      vin,
      userId
    );
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
}
