import {
  Controller,
  Post,
  Get,
  Param,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { TelemetryConfigService } from './telemetry-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../../entities/user.entity';

@Controller('telemetry-config')
@UseGuards(JwtAuthGuard)
export class TelemetryConfigController {
  private readonly logger = new Logger(TelemetryConfigController.name);

  constructor(
    private readonly telemetryConfigService: TelemetryConfigService
  ) {}

  @Get('vehicles')
  async getVehicles(@CurrentUser() user: User) {
    const userId = user.userId;
    this.logger.log(
      `🔍 Retrieving vehicle list for user: ${userId} (${user.email})`
    );
    return await this.telemetryConfigService.getVehicles(userId);
  }

  @Post('configure-all')
  async configureAllVehicles(@CurrentUser() user: User) {
    const userId = user.userId;
    this.logger.log(
      `🚗 Configuring telemetry for all vehicles (user: ${userId})`
    );
    await this.telemetryConfigService.configureAllVehicles(userId);
    return { message: 'Telemetry configuration started for all vehicles' };
  }

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
}
