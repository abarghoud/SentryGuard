import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AlertEvent } from '../../entities/alert-event.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  controllers: [AlertsController],
  exports: [AlertsService],
  imports: [TypeOrmModule.forFeature([AlertEvent])],
  providers: [AlertsService],
})
export class AlertsModule {}
