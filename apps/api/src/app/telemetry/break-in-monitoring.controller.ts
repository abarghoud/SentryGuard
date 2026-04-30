import { Controller, Post, Param, Logger, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BreakInMonitoringConfigService } from './break-in-monitoring-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConsentGuard } from '../../common/guards/consent.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../../entities/user.entity';
import { ThrottleOptions } from '../../config/throttle.config';
import { BetaTesterGuard } from '../guards/beta-tester.guard';

@Controller('telemetry-config/break-in-monitoring')
@UseGuards(JwtAuthGuard, ConsentGuard, BetaTesterGuard)
export class BreakInMonitoringController {
  private readonly logger = new Logger(BreakInMonitoringController.name);

  constructor(private readonly breakInMonitoringConfigService: BreakInMonitoringConfigService) {}

  @Throttle(ThrottleOptions.critical())
  @Post(':vin/enable')
  async enableFeature(@Param('vin') vin: string, @CurrentUser() user: User) {
    this.logger.log(`🚗 Enabling break-in monitoring for VIN: ${vin} (user: ${user.userId})`);
    return await this.breakInMonitoringConfigService.toggleBreakInMonitoring(vin, user.userId, true);
  }

  @Throttle(ThrottleOptions.critical())
  @Post(':vin/disable')
  async disableFeature(@Param('vin') vin: string, @CurrentUser() user: User) {
    this.logger.log(`🚗 Disabling break-in monitoring for VIN: ${vin} (user: ${user.userId})`);
    return await this.breakInMonitoringConfigService.toggleBreakInMonitoring(vin, user.userId, false);
  }
}
