import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { ThrottleOptions } from '../../config/throttle.config';
import { DevicesService } from './devices.service';

interface HideVehicleBody {
  vin?: string;
}

const maxVinLength = 17;
const maxInstallationIdLength = 128;

function isValidVin(vin: string | undefined): vin is string {
  return typeof vin === 'string' && vin.length > 0 && vin.length <= maxVinLength;
}

function isValidInstallationId(installationId: string): boolean {
  return installationId.length > 0 && installationId.length <= maxInstallationIdLength;
}

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Throttle(ThrottleOptions.authenticatedRead())
  @Get(':installationId/hidden-vehicles')
  public async getHiddenVehicles(
    @CurrentUser() user: User,
    @Param('installationId') installationId: string
  ): Promise<string[]> {
    if (!isValidInstallationId(installationId)) {
      return [];
    }

    return await this.devicesService.getHiddenVehicleVins(user.userId, installationId);
  }

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Post(':installationId/hidden-vehicles')
  public async hideVehicle(
    @CurrentUser() user: User,
    @Param('installationId') installationId: string,
    @Body() body: HideVehicleBody
  ): Promise<{ success: boolean }> {
    if (!isValidInstallationId(installationId) || !isValidVin(body.vin)) {
      return { success: false };
    }

    return await this.devicesService.hideVehicle(user.userId, installationId, body.vin);
  }

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Delete(':installationId/hidden-vehicles/:vin')
  public async unhideVehicle(
    @CurrentUser() user: User,
    @Param('installationId') installationId: string,
    @Param('vin') vin: string
  ): Promise<{ success: boolean }> {
    if (!isValidInstallationId(installationId) || !isValidVin(vin)) {
      return { success: false };
    }

    return await this.devicesService.unhideVehicle(user.userId, installationId, vin);
  }
}
