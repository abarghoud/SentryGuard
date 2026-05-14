import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Vehicle } from '../../entities/vehicle.entity';
import { OffensiveResponse } from '../alerts/enums/offensive-response.enum';
import { OffensiveNotificationService } from './offensive-notification.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { OFFENSIVE_DEACTIVATION_CRON_EXPRESSION } from '../../config/offensive-deactivation-cron.config';
import { SchedulerLockKey } from '../../config/scheduler-lock-key.config';

@Injectable()
export class ScheduledOffensiveDeactivationService {
  private readonly logger = new Logger(ScheduledOffensiveDeactivationService.name);

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly notificationService: OffensiveNotificationService,
    private readonly distributedLockService: DistributedLockService,
  ) {}

  @Cron(OFFENSIVE_DEACTIVATION_CRON_EXPRESSION)
  public async deactivateExpired(): Promise<void> {
    const wasExecuted = await this.distributedLockService.withLock(
      SchedulerLockKey.OffensiveDeactivation,
      () => this.execute(),
    );

    if (!wasExecuted) {
      this.logger.warn('Previous deactivation cycle still running, skipping');
    }
  }

  private async execute(): Promise<void> {
    this.logger.log('Starting offensive response deactivation cycle...');

    const expiredVehicles = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.sentry_offensive_response_until IS NOT NULL')
      .andWhere('vehicle.sentry_offensive_response_until < :now', { now: new Date() })
      .getMany();

    if (expiredVehicles.length === 0) {
      this.logger.log('No expired offensive responses found');
      return;
    }

    this.logger.log(`Found ${expiredVehicles.length} expired offensive response(s)`);

    for (const vehicle of expiredVehicles) {
      vehicle.sentry_offensive_response = OffensiveResponse.DISABLED;
      vehicle.sentry_offensive_response_until = null;
      await this.vehicleRepository.save(vehicle);

      this.logger.log(`Deactivated offensive response for VIN ${vehicle.vin}`);

      try {
        await this.notificationService.notifyDeactivated(vehicle);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to notify deactivation for VIN ${vehicle.vin}: ${errorMessage}`);
      }
    }

    this.logger.log('Offensive response deactivation cycle complete');
  }
}