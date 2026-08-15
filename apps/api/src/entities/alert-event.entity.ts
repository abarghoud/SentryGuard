import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum AlertEventSeverity {
  Critical = 'critical',
  Warning = 'warning',
}

export enum AlertEventType {
  BreakIn = 'break_in',
  Sentry = 'sentry',
}

export enum AlertEventNotificationStatus {
  Pending = 'pending',
  Sent = 'sent',
  Failed = 'failed',
}

@Entity('alert_events')
@Index(['userId', 'created_at'])
@Index(['vin'])
@Index('idx_alert_events_pending', { where: "notification_status = 'pending'" })
export class AlertEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 17 })
  vin!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  vehicle_display_name?: string | null;

  @Column({ type: 'enum', enum: AlertEventType })
  type!: AlertEventType;

  @Column({ type: 'enum', enum: AlertEventSeverity })
  severity!: AlertEventSeverity;

  @Column({ type: 'enum', enum: AlertEventNotificationStatus, default: AlertEventNotificationStatus.Pending, nullable: true })
  notification_status?: AlertEventNotificationStatus | null;

  @Column({ type: 'int', default: 0 })
  notification_attempts!: number;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne('User', 'alertEvents', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: any;
}
