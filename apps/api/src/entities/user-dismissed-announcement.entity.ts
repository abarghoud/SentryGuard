import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('user_dismissed_announcements')
export class UserDismissedAnnouncement {
  @PrimaryColumn('varchar', { length: 64 })
  user_id!: string;

  @PrimaryColumn('varchar', { length: 255 })
  announcement_key!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: any;

  @ManyToOne('FeatureAnnouncement', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'announcement_key' })
  announcement!: any;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dismissed_at!: Date;
}
