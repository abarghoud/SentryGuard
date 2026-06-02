import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('feature_announcements')
export class FeatureAnnouncement {
  @PrimaryColumn('varchar', { length: 255 })
  key!: string;

  @CreateDateColumn()
  released_at!: Date;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;
}
