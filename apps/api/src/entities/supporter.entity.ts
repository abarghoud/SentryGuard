import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum SupporterType {
  Donation = 'donation',
  Membership = 'membership',
}

@Entity('supporters')
@Index(['type', 'is_active'])
export class Supporter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  external_id?: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'int', default: 1 })
  coffees!: number;

  @Column({ type: 'enum', enum: SupporterType, default: SupporterType.Donation })
  type!: SupporterType;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({ type: 'timestamp with time zone' })
  support_date!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
