import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OffensiveResponse } from '../app/alerts/enums/offensive-response.enum';

@Entity('vehicles')
@Index(['userId', 'vin'], { unique: true })
@Index(['vin'])
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 17 })
  vin!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  display_name?: string;

  @Column({ type: 'boolean', default: false })
  sentry_mode_monitoring_enabled!: boolean;

  @Column({ type: 'boolean', default: false })
  break_in_monitoring_enabled!: boolean;

  @Column({
    type: 'enum',
    enum: OffensiveResponse,
    default: OffensiveResponse.DISABLED,
  })
  offensive_response!: OffensiveResponse;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne('User', 'vehicles', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: any;
}
