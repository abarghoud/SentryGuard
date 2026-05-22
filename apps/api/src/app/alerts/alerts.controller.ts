import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { ThrottleOptions } from '../../config/throttle.config';
import { AlertEventDto, AlertsService } from './alerts.service';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Throttle(ThrottleOptions.authenticatedRead())
  @Get()
  public async listAlerts(@CurrentUser() user: User): Promise<AlertEventDto[]> {
    return await this.alertsService.listForUser(user.userId);
  }
}
