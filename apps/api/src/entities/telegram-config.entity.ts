import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum TelegramLinkStatus {
  PENDING = 'pending',
  LINKED = 'linked',
  EXPIRED = 'expired',
}

@Entity('telegram_configs')
@Index(['userId'], { unique: true })
export class TelegramConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  chat_id?: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  link_token: string;

  @Column({
    type: 'enum',
    enum: TelegramLinkStatus,
    default: TelegramLinkStatus.PENDING,
  })
  status: TelegramLinkStatus;

  @Column({ type: 'timestamp', nullable: true })
  linked_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at?: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToOne(() => User, (user) => user.telegramConfig, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

