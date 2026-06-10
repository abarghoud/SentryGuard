import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum AlertEventSeverity {
  Critical = 'critical',
  Warning = 'warning',
}

export enum AlertEventType {
  BreakIn = 'break_in',
  Sentry = 'sentry',
}

@Entity('alert_events')
@Index(['userId', 'created_at'])
@Index(['vin'])
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

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne('User', 'alertEvents', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: any;
}
