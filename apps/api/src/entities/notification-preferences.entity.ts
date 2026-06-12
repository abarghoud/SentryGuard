import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreferences {
  @PrimaryColumn('varchar', { length: 64 })
  userId!: string;

  @Column({ type: 'boolean', default: true })
  telegram_enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne('User', 'notificationPreferences', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: any;
}
