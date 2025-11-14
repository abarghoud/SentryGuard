import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('user_consents')
export class UserConsent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 64 })
  userId!: string;

  @ManyToOne('User', 'consents')
  @JoinColumn({ name: 'userId' })
  user!: any;

  @Column({ type: 'varchar', length: 10 })
  version!: string;

  @Column({ type: 'varchar', length: 64 })
  textHash!: string;

  @Column({ type: 'timestamp' })
  acceptedAt!: Date;

  @Column({ type: 'varchar', length: 2 })
  locale!: string;

  @Column({ type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ type: 'text' })
  userAgent!: string;

  @Column({ type: 'varchar', length: 100 })
  appTitle!: string;

  @Column({ type: 'varchar', length: 100 })
  partnerName!: string;

  @Column({ type: 'jsonb', nullable: true })
  vehiclesSnapshot?: string[];

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
