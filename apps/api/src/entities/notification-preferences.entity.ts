import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreferences {
  @PrimaryColumn('varchar', { length: 64 })
  userId!: string;

  @Column({ type: 'boolean', default: false })
  push_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  telegram_enabled!: boolean;

  @Column({ type: 'boolean', default: false })
  critical_only!: boolean;

  @Column({ type: 'boolean', default: false })
  critical_alerts_enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne('User', 'notificationPreferences', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: any;
}
