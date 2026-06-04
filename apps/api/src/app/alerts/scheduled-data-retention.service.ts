import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, Repository } from 'typeorm';

import { AlertEvent } from '../../entities/alert-event.entity';

const DEFAULT_RETENTION_DAYS = 365;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ScheduledDataRetentionService {
  private readonly logger = new Logger(ScheduledDataRetentionService.name);
  private readonly retentionDays = this.resolveRetentionDays();

  constructor(
    @InjectRepository(AlertEvent)
    private readonly alertEventRepository: Repository<AlertEvent>
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  public async purgeExpiredAlertEvents(): Promise<void> {
    const cutoff = new Date(Date.now() - this.retentionDays * MILLISECONDS_PER_DAY);
    const result = await this.alertEventRepository.delete({ created_at: LessThan(cutoff) });

    this.logger.log(`[RETENTION] Deleted ${result.affected ?? 0} alert event(s) older than ${this.retentionDays} days`);
  }

  private resolveRetentionDays(): number {
    const configured = Number(process.env.ALERT_RETENTION_DAYS);

    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_RETENTION_DAYS;
  }
}
