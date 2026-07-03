import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('device_hidden_vehicles')
@Index(['userId', 'installationId', 'vin'], { unique: true })
@Index(['userId', 'vin'])
export class DeviceHiddenVehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 128 })
  installationId!: string;

  @Column({ type: 'varchar', length: 17 })
  vin!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: unknown;
}
