import { Body, Controller, Logger, Param, Patch, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { ConsentGuard } from '../../common/guards/consent.guard';
import { ThrottleOptions } from '../../config/throttle.config';
import { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateBreakInDetectionDto } from './update-break-in-detection.dto';
import {
  UpdateBreakInDetectionResult,
  VehicleBreakInDetectionConfigService,
} from './vehicle-break-in-detection-config.service';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, ConsentGuard)
export class BreakInDetectionController {
  private readonly logger = new Logger(BreakInDetectionController.name);

  constructor(private readonly vehicleBreakInDetectionConfigService: VehicleBreakInDetectionConfigService) {}

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Patch(':vin/break-in-detection')
  public async updateBreakInDetection(
    @Param('vin') vin: string,
    @CurrentUser() user: User,
    @Body() body: UpdateBreakInDetectionDto
  ): Promise<UpdateBreakInDetectionResult> {
    this.logger.log(`Updating break-in detection for VIN: ${vin} (user: ${user.userId})`);

    return await this.vehicleBreakInDetectionConfigService.updateBreakInDetection(user.userId, vin, body);
  }
}
