import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { User } from './user.entity';

@Entity('user_sessions')
@Index(['jwt_hash'], { unique: true })
@Index(['userId', 'revoked_at', 'expires_at'])
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 64 })
  jwt_hash!: string;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  revoked_at?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_used_at?: Date | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  device_type?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  device_name?: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne('User', 'sessions', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
