import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { TelegramConfig } from './telegram-config.entity';

@Entity('users')
export class User {
  @PrimaryColumn('varchar', { length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  full_name?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profile_image_url?: string;

  // Encrypted tokens - we'll encrypt these at the service level
  @Column({ type: 'text' })
  access_token!: string;

  @Column({ type: 'text' })
  refresh_token!: string;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @OneToMany(() => Vehicle, (vehicle) => vehicle.user)
  vehicles!: Vehicle[];

  @OneToOne(() => TelegramConfig, (config) => config.user)
  telegramConfig!: TelegramConfig;
}

