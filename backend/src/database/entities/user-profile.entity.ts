import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'user_profile' })
export class UserProfile {
  @PrimaryColumn('uuid')
  user_id!: string;

  @OneToOne(() => User, (user) => user.profiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'int', nullable: true })
  age?: number;

  @Column({ type: 'numeric', nullable: true })
  height_cm?: number;

  @Column({ type: 'numeric', nullable: true })
  weight_kg?: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  activity_level?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  goal?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  goal_intensity?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  diet_type?: string;

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  allergy_keys!: string[];

  @Column({ type: 'boolean', default: true })
  breakfast_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  snack_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  lunch_enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  dinner_enabled!: boolean;

  @Column({ type: 'varchar', length: 50, default: 'easy' })
  max_difficulty!: string;

  @Column({ type: 'numeric', nullable: true })
  weekly_budget_gbp?: number;
}
