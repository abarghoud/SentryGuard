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

  @Column({ type: 'timestamp', nullable: true })
  muted_until?: Date | null;

  @Column({ type: 'int', default: 0 })
  bot_ui_version: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToOne('User', 'telegramConfig', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: any;
}
