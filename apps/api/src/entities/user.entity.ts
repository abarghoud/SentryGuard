import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';

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

  // JWT token for secure session management
  @Column({ type: 'text', nullable: true })
  jwt_token?: string;

  @Column({ type: 'timestamp', nullable: true })
  jwt_expires_at?: Date;

  // Encrypted tokens - we'll encrypt these at the service level
  @Column({ type: 'text' })
  access_token!: string;

  @Column({ type: 'text' })
  refresh_token!: string;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @Column({ type: 'boolean', default: false })
  debug_messages!: boolean;

  @Column({ type: 'varchar', length: 2, default: 'en' })
  preferred_language!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @OneToMany('Vehicle', 'user')
  vehicles!: any[];

  @OneToOne('TelegramConfig', 'user')
  telegramConfig!: any;
}
