import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('push_device_tokens')
@Index(['token'], { unique: true })
@Index(['userId'])
export class PushDeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'text' })
  token!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  platform?: string | null;

  @Column({ type: 'boolean', default: true })
  push_enabled!: boolean;

  @Column({ type: 'boolean', default: false })
  critical_only!: boolean;

  @Column({ type: 'boolean', default: false })
  critical_alerts_enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne('User', 'pushDeviceTokens', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: any;
}
