import { BadRequestException, Body, Controller, Logger, Param, Patch, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { ConsentGuard } from '../../common/guards/consent.guard';
import { ThrottleOptions } from '../../config/throttle.config';
import { User } from '../../entities/user.entity';
import { AlertSound } from '../alerts/enums/alert-sound.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  UpdateAlertSoundsDto,
  UpdateAlertSoundsResult,
  VehicleAlertSoundConfigService,
} from './vehicle-alert-sound-config.service';

@Controller('vehicle-alert-sounds')
@UseGuards(JwtAuthGuard, ConsentGuard)
export class VehicleAlertSoundsController {
  private readonly logger = new Logger(VehicleAlertSoundsController.name);

  constructor(private readonly vehicleAlertSoundConfigService: VehicleAlertSoundConfigService) {}

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Patch(':vin')
  public async updateAlertSounds(
    @Param('vin') vin: string,
    @CurrentUser() user: User,
    @Body() body: UpdateAlertSoundsDto
  ): Promise<UpdateAlertSoundsResult> {
    this.validateUpdateBody(body);

    this.logger.log(`Updating alert sounds for VIN: ${vin} (user: ${user.userId})`);

    return await this.vehicleAlertSoundConfigService.updateAlertSounds(user.userId, vin, body);
  }

  private validateUpdateBody(body: UpdateAlertSoundsDto): void {
    if (body.sentry_alert_sound === undefined && body.break_in_alert_sound === undefined) {
      throw new BadRequestException('sentry_alert_sound or break_in_alert_sound must be provided');
    }

    this.validateAlertSound('sentry_alert_sound', body.sentry_alert_sound);
    this.validateAlertSound('break_in_alert_sound', body.break_in_alert_sound);
  }

  private validateAlertSound(field: string, value?: string): void {
    if (value === undefined) {
      return;
    }

    const validSounds = Object.values(AlertSound);

    if (!validSounds.includes(value as AlertSound)) {
      throw new BadRequestException(`Invalid ${field} value. Must be one of: ${validSounds.join(', ')}`);
    }
  }
}
