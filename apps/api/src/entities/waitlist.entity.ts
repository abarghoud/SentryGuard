import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WaitlistStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

@Entity('waitlist')
@Index(['status', 'emailQueuedAt', 'welcomeEmailSentAt'])
export class Waitlist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName?: string;

  @Column({
    type: 'enum',
    enum: WaitlistStatus,
    default: WaitlistStatus.Pending,
  })
  status!: WaitlistStatus;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  welcomeEmailSentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  emailQueuedAt?: Date;

  @Column({ type: 'varchar', length: 2, default: 'en' })
  preferredLanguage!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
