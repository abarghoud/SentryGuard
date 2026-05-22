import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AlertEvent, AlertEventSeverity, AlertEventType } from '../../entities/alert-event.entity';

export interface AlertEventDto {
  created_at: Date;
  id: string;
  message: string;
  severity: AlertEventSeverity;
  title: string;
  type: AlertEventType;
  vehicle_display_name?: string | null;
  vin: string;
}

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertEvent)
    private readonly alertEventRepository: Repository<AlertEvent>
  ) {}

  public async listForUser(userId: string): Promise<AlertEventDto[]> {
    const events = await this.alertEventRepository.find({
      order: { created_at: 'DESC' },
      take: 50,
      where: { userId },
    });
    return events.map((event) => this.toDto(event));
  }

  public async record(
    userId: string,
    vin: string,
    type: AlertEventType,
    severity: AlertEventSeverity,
    title: string,
    message: string,
    vehicleDisplayName?: string
  ): Promise<void> {
    await this.alertEventRepository.save(
      this.alertEventRepository.create({ userId, vin, type, severity, title, message, vehicle_display_name: vehicleDisplayName })
    );
  }

  private toDto(event: AlertEvent): AlertEventDto {
    return {
      created_at: event.created_at,
      id: event.id,
      message: event.message,
      severity: event.severity,
      title: event.title,
      type: event.type,
      vehicle_display_name: event.vehicle_display_name,
      vin: event.vin,
    };
  }
}
